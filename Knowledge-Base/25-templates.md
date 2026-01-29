# Templates

## Overview

R-Link templates allow users to create, manage, and reuse room configurations across the platform. Templates are managed through the **TemplatesTab** in the Admin Dashboard and are built around the `RoomTemplate` entity. Each template belongs to an account, can be assigned to one of 11 predefined categories, and optionally designated as the default template for new rooms. An AI assistant is integrated to help generate and refine template content.

---

## RoomTemplate Entity

The `RoomTemplate` entity is the core data model for all template operations.

### Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (auto-generated) |
| `account_id` | string | The account that owns this template |
| `name` | string | Display name of the template |
| `description` | string | Description of the template purpose |
| `category` | string | One of the 11 predefined categories |
| `is_default` | boolean | Whether this is the default template for the account |
| `brand_kit_id` | string | Associated BrandKit entity ID |
| `room_config` | object | Full room configuration snapshot |
| `created_date` | datetime | When the template was created |
| `updated_date` | datetime | When the template was last modified |

### Key Behaviors

- Every template must belong to exactly one account (via `account_id`).
- The `is_default` field determines which template is automatically applied when creating new rooms.
- Only one template per account can have `is_default = true` at any time.
- Templates store a complete room configuration snapshot that can be applied to new or existing rooms.

---

## Template Categories

R-Link supports 11 template categories. Each category represents a common use case and provides sensible defaults for room layout, features, and interaction settings.

| # | Category | Typical Use Case |
|---|----------|-----------------|
| 1 | `podcast` | Audio-first or audio/video recording sessions with host and guest layouts |
| 2 | `webinar` | One-to-many presentation format with audience Q&A and registration |
| 3 | `meeting` | Standard collaborative meeting with equal participant access |
| 4 | `workshop` | Interactive session with breakout rooms, polls, and hands-on activities |
| 5 | `event` | Large-scale virtual event with stage, backstage, and audience areas |
| 6 | `sales` | Sales demo format with screen sharing, CTA overlays, and lead capture |
| 7 | `interview` | Two-person interview format with recording and transcript focus |
| 8 | `auction` | Live auction format with bidding overlays and countdown timers |
| 9 | `office_hours` | Drop-in format with queue management and scheduling |
| 10 | `conference` | Multi-track conference with sessions, speakers, and networking |
| 11 | `custom` | Blank slate for fully customized configurations |

### Category Selection

- Users select a category when creating a new template.
- The category determines the initial configuration defaults but can be fully customized afterward.
- The `custom` category starts with minimal defaults, giving the user complete control.
- Changing a template's category after creation does not reset the configuration; it only updates the category label.

### Common Customer Questions About Categories

**Q: Can I change a template's category after creating it?**
A: Yes. Changing the category updates the label but does not reset any configuration you have already customized.

**Q: What is the difference between "event" and "conference"?**
A: "Event" is designed for single-track live events with a stage/backstage model. "Conference" supports multi-track sessions with multiple speakers and networking features.

**Q: Which category should I use for a product demo?**
A: The "sales" category is optimized for product demos. It includes screen sharing defaults, CTA overlays, and lead capture integration.

---

## Template Operations

### Create Template

Creating a new template involves:

1. User navigates to the Templates tab in the Admin Dashboard.
2. User clicks "Create Template" or selects a category to start from.
3. User provides a name, description, and selects a category.
4. The template is saved with `account_id` set to the current user's account.
5. If no other templates exist, the new template is automatically set as default (`is_default = true`).

### Read / List Templates

- Templates are listed in the TemplatesTab, filtered by `account_id`.
- Templates can be filtered by category.
- The default template is visually distinguished in the list.

### Update Template

- Users can edit any field of a template they own.
- Updating a template does not retroactively change rooms that were created from it.
- The `updated_date` field is automatically refreshed on save.

### Delete Template

- Users can delete any non-default template.
- If the default template is deleted, no template is automatically promoted to default; the user must manually set a new default.
- Deleting a template does not affect rooms that were previously created from it.

### Set Default Template

Setting a template as the default uses a specific mechanism to ensure only one template is default at a time:

```
1. User selects "Set as Default" on a template.
2. System retrieves all templates for the account.
3. Using Promise.all(), the system simultaneously:
   a. Sets is_default = false on ALL templates for the account.
   b. Sets is_default = true on the SELECTED template.
4. The UI refreshes to reflect the new default.
```

**Technical Detail:** The `Promise.all()` approach ensures atomicity -- all updates happen concurrently, minimizing the window where multiple templates could have `is_default = true`. The selected template's `is_default` is set to `true` as part of the same batch.

**Customer-Facing Explanation:** When you set a new default template, the system instantly updates all templates so that only your chosen template is marked as the default. This default template will be automatically applied whenever you create a new room.

### Duplicate Template

- Users can duplicate any template.
- The duplicated template receives a new `id` and has `is_default` set to `false`.
- The name is appended with " (Copy)" or a similar suffix.
- All configuration from the original template is copied to the duplicate.
- The duplicate belongs to the same account as the original.

---

## Template-BrandKit Association

Templates can be associated with a BrandKit to apply consistent visual branding.

### How It Works

- Each template has an optional `brand_kit_id` field.
- When a template is applied to a room, the associated BrandKit's styles (colors, fonts, logos) are applied to the room.
- If no `brand_kit_id` is set, the account's default BrandKit is used.
- Changing a BrandKit after room creation does not retroactively update existing rooms unless the user explicitly re-applies the template.

### Common Customer Questions About BrandKit Association

**Q: If I change my BrandKit, do existing rooms update automatically?**
A: No. The BrandKit is applied at the time a room is created from the template. To update an existing room, you would need to re-apply the template or manually update the room's branding.

**Q: Can different templates use different BrandKits?**
A: Yes. Each template can reference a different BrandKit, allowing you to maintain distinct visual identities for different types of events.

---

## AI Assistant (TemplateAIAssistant)

The TemplateAIAssistant is an integrated AI tool that helps users create and refine template configurations. It operates in three distinct modes.

### Generate Mode

**Purpose:** Create a complete template configuration from a text description.

**How It Works:**
1. User provides a natural language description of their desired template (e.g., "A professional webinar template for software demos with Q&A and lead capture").
2. The AI generates a full template configuration including:
   - Room layout settings
   - Feature toggles (chat, Q&A, polls, etc.)
   - Overlay configurations
   - Branding suggestions
3. User reviews the generated configuration and can accept, modify, or regenerate.

**When to Recommend:** Suggest Generate mode when a customer is starting from scratch and knows what they want but is unsure how to configure it manually.

### Variations Mode

**Purpose:** Create multiple variations of an existing template for A/B testing or different audience segments.

**How It Works:**
1. User selects an existing template as the base.
2. User specifies how many variations they want and optionally describes the desired differences.
3. The AI generates distinct variations that maintain the core structure but differ in specific aspects (layout, color scheme, interaction settings, etc.).
4. User can save any or all variations as new templates.

**When to Recommend:** Suggest Variations mode when a customer wants to test different configurations for the same type of event, or when they need slightly different setups for different audiences.

### Suggestions Mode

**Purpose:** Get AI-powered recommendations to improve an existing template.

**How It Works:**
1. User opens Suggestions mode on an existing template.
2. The AI analyzes the current configuration and provides specific, actionable suggestions for improvement.
3. Suggestions may include:
   - Enabling features that are commonly used with the template's category
   - Layout optimizations for better audience engagement
   - Interaction settings that match best practices for the use case
   - Branding improvements
4. User can accept individual suggestions or dismiss them.

**When to Recommend:** Suggest Suggestions mode when a customer has a working template but wants to optimize it, or when they report that their events are not getting the engagement they expect.

### Common Customer Questions About AI Assistant

**Q: Does the AI assistant cost extra?**
A: The AI assistant is included with your plan. There are no additional charges for using Generate, Variations, or Suggestions modes.

**Q: Can I undo changes made by the AI?**
A: Yes. All AI-generated changes are presented as suggestions before being applied. You can also revert to a previous version of your template at any time.

**Q: The AI generated a template that does not match what I described. What should I do?**
A: Try providing more specific details in your description. For example, instead of "a webinar template," try "a webinar template for 200+ attendees with screen sharing, live polls, and a Q&A panel on the right side." You can also use Suggestions mode to refine the generated output.

**Q: Can I use the AI to modify just one part of my template?**
A: Yes. Use Suggestions mode, which analyzes your existing template and provides targeted improvements. You can accept only the suggestions that address the part you want to change.

---

## Troubleshooting

### Template Not Appearing in Room Creation

**Possible Causes:**
- The template belongs to a different account. Templates are scoped to `account_id`.
- The template was recently created and the UI has not refreshed. Ask the customer to refresh the page.
- The template was deleted by another team member.

**Resolution Steps:**
1. Verify the template exists in the Templates tab.
2. Confirm the user is logged into the correct account.
3. Refresh the page.
4. If the template is missing, it may have been deleted. Check with other account administrators.

### Default Template Not Being Applied

**Possible Causes:**
- No template has `is_default = true` for the account.
- The default template assignment failed (rare; usually a network issue during the `Promise.all` operation).

**Resolution Steps:**
1. Navigate to the Templates tab and verify which template shows the default indicator.
2. If no template is marked as default, select the desired template and click "Set as Default."
3. If the issue persists after setting a default, ask the customer to log out and log back in to refresh their session.

### AI Assistant Not Generating Results

**Possible Causes:**
- Network connectivity issues.
- The AI service is temporarily unavailable.
- The input description is too vague for the AI to generate a meaningful configuration.

**Resolution Steps:**
1. Check if other platform features are working (to rule out network issues).
2. Ask the customer to try again with a more detailed description.
3. If the issue persists, escalate to engineering with the error message (if any) and the user's account ID.

### Template Duplication Creates Unexpected Results

**Possible Causes:**
- The original template referenced a BrandKit that was subsequently deleted.
- The original template's configuration includes deprecated settings.

**Resolution Steps:**
1. Create a new template from scratch using the same category.
2. Use the AI assistant in Generate mode to recreate the configuration.
3. If the issue persists, escalate to engineering with the original and duplicate template IDs.

---

## Internal Reference

### API Operations Summary

| Operation | Method | Key Parameters |
|-----------|--------|---------------|
| Create template | POST | `account_id`, `name`, `category`, `room_config` |
| List templates | GET | `account_id`, optional `category` filter |
| Update template | PUT | `id`, updated fields |
| Delete template | DELETE | `id` |
| Set default | PUT (batch) | All templates for account: `is_default = false`; selected: `is_default = true` |
| Duplicate | POST | Source `id`; new `id` generated, `is_default = false` |
| AI Generate | POST | `description`, `category` |
| AI Variations | POST | `template_id`, `count`, optional `description` |
| AI Suggestions | POST | `template_id` |

### Related Entities

- **Account**: Owner of all templates (via `account_id`)
- **BrandKit**: Visual branding applied to templates (via `brand_kit_id`)
- **Room**: Created from templates; inherits configuration at creation time

### Related Admin Tabs

- **TemplatesTab**: Primary management interface for templates
- **BrandKitTab**: Manage BrandKits that can be associated with templates
- **RoomsTab**: Where templates are applied during room creation
