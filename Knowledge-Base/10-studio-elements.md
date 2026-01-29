# 10 - Studio Elements

## Overview

The R-Link Studio Elements system provides a comprehensive library of interactive components that hosts can create, organize, and activate during live sessions. Elements are managed through the **Elements Tab** in the studio left sidebar, powered by the `ElementsPanel` component. Each element belongs to an `ElementFolder` and can be activated/deactivated on stage in real time. The system supports 16+ element types, drag-and-drop reordering, favorites, duplication, folder organization, and an Element Marketplace for discovering new overlays.

---

## Accessing the Elements Tab

1. Enter any R-Link Studio session (Meeting, Webinar, or Live Stream).
2. Open the **Left Sidebar**.
3. Click the **Elements** tab.
4. The panel displays:
   - **Asset Library** button -- opens the centralized asset browser for uploading and managing media files.
   - **Element Marketplace** button -- opens the marketplace modal to browse and install community-created elements.
   - **Search bar** -- filter elements by name or type label.
   - **Favorites toggle** -- filter to only show favorited elements.
   - **Add Folder** button -- create a new folder for organizing elements.
   - **Add Element** dropdown -- create any of the 16+ element types.
   - **Folder tree** -- collapsible folders containing elements with drag-and-drop reorder support.

---

## Element Types

R-Link supports 16 core element types, each with a dedicated icon, color, and behavior. Elements are identified by their `type` field.

### 1. CTA Banner (`cta`)

- **Icon:** Image (pink)
- **Purpose:** Display a call-to-action banner overlay on the stage.
- **Data fields:** Text content, link URL, button text, styling options.
- **Activation:** Click to show/hide the CTA banner on screen. When active, renders as an `activeCTA` overlay visible to all viewers.
- **Use case:** Drive viewers to a landing page, sign-up form, or promotional offer during a live session.

### 2. Talking Point (`talking_point`)

- **Icon:** MessageSquareText (purple)
- **Purpose:** Display a lower-third text overlay with an optional icon.
- **Data fields:** `text` (main message), `icon` (emoji/icon), `auto_hide_ms` (auto-dismiss timer in milliseconds, 0 = manual dismiss).
- **Activation:** Shows the `TalkingPointOverlay` component as a full-width lower-third bar at the bottom of the stage.
- **Branding integration:** Uses the session branding colors (`primaryColor`, `accentColor`, `font`) for consistent visual identity.
- **Auto-hide:** If `auto_hide_ms > 0`, the overlay automatically fades out after the specified duration. After the exit animation (300ms), the `onAutoHide` callback fires to clean up state.

### 3. Web Overlay (`web_overlay`)

- **Icon:** Globe (blue)
- **Purpose:** Embed any external webpage as an iframe overlay on the stage.
- **Data fields:** URL, dimensions, position, opacity.
- **Rendered by:** `WebOverlayRenderer` component.
- **Use case:** Display live dashboards, external content, social media feeds, or documentation during a session.

### 4. Poll (`poll`)

- **Icon:** BarChart3 (amber)
- **Purpose:** Create and display interactive polls for audience participation.
- **Data fields:** `question`, `poll_type` (`'multiple_choice'`, `'yes_no'`, `'multiple_answer'`), `options` (array of `{ text, color, votes }`), `appearance` (position, size, colors, border settings), `results_settings` (`show_immediately`).
- **Rendered by:** `PollStageRenderer` component.
- **Poll types:**
  - **Multiple Choice** -- Viewers select one option from the list.
  - **Yes/No** -- Binary choice with green "Yes" and red "No" buttons.
  - **Multiple Answer** -- Viewers can select multiple options ("Select all that apply").
- **Appearance settings:** `position` (`bottom_center`, `bottom_left`, `bottom_right`, `side_panel`, `fullscreen`), `size` (`small` 72px, `medium` 96px, `large` 500px), `background_color`, `accent_color`, `border_enabled`.
- **Results:** If `results_settings.show_immediately` is true, progress bars with vote counts and percentages display after the viewer votes. Otherwise, results are hidden until the host reveals them.
- **Host controls:** Only the host sees the close (X) button to end the poll on stage.

### 5. Video (`video`)

- **Icon:** Video (red)
- **Purpose:** Add pre-recorded video content for playback during sessions.
- **Data fields:** Video file URL, title, duration.
- **Preview:** Host can use the "Preview" option in the element context menu to watch the video before activating.
- **Use case:** Play introduction videos, product demos, or pre-recorded segments during live sessions.

### 6. Audio (`audio`)

- **Icon:** Music (green)
- **Purpose:** Add audio clips for background music or sound effects.
- **Data fields:** Audio file URL, title, ducking settings.
- **Ducking:** When audio elements play, the system can automatically lower other audio sources to ensure the audio element is clearly audible.
- **Preview:** Available via the context menu "Preview" action.

### 7. Timer (`timer`)

- **Icon:** Clock (cyan)
- **Purpose:** Display countdown or count-up timers on stage.
- **States:** `idle` (not started), `running` (actively counting), `paused` (stopped temporarily, can resume).
- **Data fields:** Duration, display format, start/pause/reset controls, visual style.
- **Use case:** Countdown to session start, break timers, Q&A time limits, auction countdowns.

### 8. Presentation (`presentation`)

- **Icon:** Presentation (orange)
- **Purpose:** Display slide decks on stage with transition controls.
- **Data fields:** `file_url` (uploaded file), slides array, transition settings.
- **Activation:** Clicking the element card starts playback. The "Edit" context menu option opens the configuration modal. This is a deliberate design choice -- the card click never opens a file picker.
- **Share:** Context menu includes a "Share" action (`onSharePresentation`) for distributing the presentation link.
- **Preview:** Available via the context menu.
- **Transitions:** Supports configurable slide transitions between slides.

### 9. Prompter (`prompter`)

- **Icon:** AlignLeft (teal)
- **Purpose:** Teleprompter for the host to read scripted content.
- **Modes:** `docked` (inline in the studio) or `detached` (floating window).
- **Activation:** Context menu includes "Open Teleprompter" action. Clicking the element card also activates it.
- **Use case:** Keep hosts on script during presentations, keynotes, or product launches.

### 10. Product Showcase (`product_showcase`)

- **Icon:** ShoppingBag (emerald)
- **Purpose:** Display products with images, descriptions, and pricing during live commerce sessions.
- **Data fields:** Product details, images, pricing, links.
- **Use case:** E-commerce live streams, product launches, shopping events.

### 11. Checkout (`checkout`)

- **Icon:** CreditCard (violet)
- **Purpose:** Enable in-session purchases with a checkout overlay.
- **Data fields:** Product info, pricing, `purchaseNotifications` (show real-time purchase activity).
- **Purchase notifications:** When enabled, viewers see toast notifications of other viewers' purchases, creating social proof and urgency.
- **Use case:** Live commerce, flash sales, exclusive offers during webinars.

### 12. Lead Capture (`lead_capture`)

- **Icon:** Mail (emerald)
- **Purpose:** Collect viewer contact information during live sessions.
- **Data fields:** Form fields, CTA text, thank-you message.
- **Use case:** Capture emails for follow-up, gated content access, newsletter sign-ups.

### 13. Auction (`auction`)

- **Icon:** Gavel (fuchsia)
- **Purpose:** Run live auctions with real-time bidding during sessions.
- **Data fields:** Item details, starting price, bid increment, duration.
- **AuctionSession entity:** Tracks the live auction state:
  - `status` -- `'active'`, `'scheduled'`, `'paused'`, `'ended'`
  - `current_price` -- Current highest bid
  - `total_bids` -- Number of bids placed
  - `unique_bidders` -- Count of distinct bidders
  - `time_extensions` -- Automatic time extensions when bids arrive near the deadline
- **Use case:** Charity auctions, art sales, exclusive item drops during live events.

### 14. Contract (`contract`)

- **Icon:** FileSignature (indigo)
- **Purpose:** Present documents for review and signature during live sessions.
- **Data fields:** `file_url` (document URL), `display_mode` (`'modal'` -- shows as a modal overlay).
- **Integrations:** Supports DocuSign and GoHighLevel for electronic signature workflows. When integrated, viewers can sign documents directly within the R-Link session.
- **Use case:** Live deal closings, agreement sign-offs, onboarding paperwork during webinars.

### 15. Leaderboard (`leaderboard`)

- **Icon:** Trophy (yellow)
- **Purpose:** Display rankings and scores during sessions.
- **Data fields:** Participant list, scores, ranking criteria.
- **Use case:** Gamification, contests, training sessions with scoring.

### 16. Crypto Ticker (`crypto_ticker`)

- **Icon:** LineChart (green-500)
- **Purpose:** Display live cryptocurrency price data.
- **Data fields:** Token selection, display format, update interval.
- **Use case:** Web3-focused streams, crypto education, trading sessions.

---

## Rally Overlays (11 Types)

In addition to the 16 core element types, R-Link provides 11 specialized Rally/Web3 overlay types managed through the `OverlayManager` and `RallyOverlaysPanel`:

| Overlay Type | Component | Description |
|-------------|-----------|-------------|
| `rally_badge` | `RallyBadge` | "Powered by Rally" branding badge |
| `nft_showcase` | `NFTShowcase` | Display NFT collection items |
| `token_drop` | `TokenRewardDrop` | Animated token reward drops |
| `price_tracker` | `RLYPriceTracker` | Live RLY token price display |
| `token_balance` | `TokenBalance` | Show wallet token balance |
| `wallet_status` | `WalletStatus` | Wallet connection status indicator |
| `mint_counter` | `MintCounter` | NFT minting progress counter |
| `gas_tracker` | `GasTracker` | Current gas fee display |
| `volume_display` | `VolumeDisplay` | Trading volume metrics |
| `community_stats` | `CommunityStats` | Community engagement statistics |
| `staking_rewards` | `StakingRewards` | Staking reward tracking |

Rally overlays are created as `UserOverlay` entities with `room_id`, `template_id` (the overlay type), `custom_config`, `position` (x, y, width, height), `styling` (font, colors, borders, shadows), `is_visible`, and `z_index`. They are draggable on the stage and support per-overlay customization through the `OverlayCustomizationModal`.

---

## Element Folder System

Elements are organized into `ElementFolder` objects. Each folder belongs to a room (`room_id`) or is global (`is_global`).

### Folder Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique folder identifier |
| `name` | string | Display name (e.g., "Webinar Assets") |
| `color` | string | Hex color code for the folder icon |
| `room_id` | string | Room this folder belongs to |
| `is_global` | boolean | If true, folder is available across all rooms |
| `order` | number | Sort position among folders |
| `is_default` | boolean | If true, new elements default to this folder |

### Available Folder Colors

The `ElementFolderModal` provides 8 preset colors:
- `#6a1fbf` (purple, default), `#00c853` (green), `#ff5722` (orange), `#2196f3` (blue)
- `#9c27b0` (deep purple), `#ff9800` (amber), `#e91e63` (pink), `#00bcd4` (teal)

### Creating a Folder

1. Click the **Folder** button at the top of the Elements panel.
2. Enter a folder name in the `ElementFolderModal`.
3. Select a color from the preset palette.
4. Click **Create Folder**.

### Editing a Folder

1. Click the three-dot menu on the folder header.
2. Select **Rename**.
3. Modify the name and/or color.
4. Click **Save Changes**.

### Deleting a Folder

1. Click the three-dot menu on the folder header.
2. Select **Delete**.
3. Confirm deletion. (Elements in the folder should be moved first.)

---

## Element CRUD Operations

### Creating an Element

1. Click the **Add Element** button in the Elements panel.
2. Select the desired element type from the dropdown (all 16 types listed).
3. The element is created with default values:
   - `type`: selected type
   - `name`: "New [Type Label]" (e.g., "New CTA Banner")
   - `folder_id`: first available folder
   - `data`: empty object `{}`
   - `room_id`: current room ID (if applicable)
4. The element appears in the first folder and can be configured by opening its Edit modal.

### Editing an Element

1. Click the three-dot menu (MoreVertical icon) on any element.
2. Select **Edit**.
3. The type-specific configuration modal opens.
4. Make changes and save.

### Renaming an Element

1. Click the three-dot menu and select **Rename**.
2. The element name becomes an inline text input.
3. Type the new name.
4. Press **Enter** to save or **Escape** to cancel.
5. Clicking elsewhere (blur) also saves the change.

### Duplicating an Element

1. Click the three-dot menu and select **Duplicate**.
2. A copy of the element is created with "(Copy)" appended to the name.
3. The duplicate inherits all data and settings from the original.

### Deleting an Element

1. Click the three-dot menu and select **Delete**.
2. The element is permanently removed.

### Moving an Element Between Folders

1. Click the three-dot menu and hover over **Move to**.
2. A submenu lists all available folders.
3. The current folder is shown with a "Current" label and is disabled.
4. Select the destination folder to move the element.

---

## Element Activation and Deactivation

Elements are activated and deactivated to control what appears on the live stage.

### Activation Model

The system uses an `activeElements` object keyed by element type:

```
activeElements = {
  cta: { id: 'elem_123', type: 'cta', name: 'Buy Now Banner', data: {...} },
  poll: { id: 'elem_456', type: 'poll', name: 'Quick Survey', data: {...} }
}
```

- **One element per type** can be active at a time. Activating a new CTA element replaces the currently active CTA.
- Activation is checked via: `activeElements[element.type]?.id === element.id`

### Activating an Element

- **Click the element card** -- toggles activation. If inactive, calls `onActivateElement(element)`. If already active, calls `onDeactivateElement(element)`.
- **Presentations:** Clicking the card starts playback; the Edit menu opens the configuration modal.
- Active elements display with a purple background (`bg-[#6a1fbf]`) and white text/icons.
- The containing folder shows a subtle purple tint (`bg-[#6a1fbf]/20`) when any element inside it is active.

### Deactivating an Element

- **Click the active element card** again to deactivate it.
- The element returns to its default gray appearance.
- The overlay/component is removed from the live stage.

---

## Favorites

- Toggle favorites via the three-dot menu: **Favorite** / **Unfavorite**.
- Favorited elements have `is_favorite: true`.
- Use the **Favorites** filter button (star icon) at the top of the Elements panel to show only favorited elements.
- The star icon fills yellow when the favorites filter is active.

---

## Drag-and-Drop Reordering

Elements within a folder can be reordered via drag-and-drop:

1. Grab the **grip handle** (GripVertical icon) on the left side of any element.
2. Drag it to a new position within the same folder.
3. Drop to confirm the new order.
4. The system uses optimistic local state for immediate visual feedback.
5. The `onReorderElements` callback sends the new order values to the backend:
   ```
   [{ id: 'elem_1', order: 0 }, { id: 'elem_2', order: 1 }, ...]
   ```
6. Once the backend confirms, the local optimistic state clears.
7. If the reorder matches the backend response, the UI seamlessly updates without flicker.

The drag-and-drop system is powered by `@hello-pangea/dnd` with `DragDropContext`, `Droppable` (per folder), and `Draggable` (per element).

---

## Search and Filtering

- **Search:** Type in the search bar to filter elements by name or type label (e.g., typing "timer" matches Timer elements, typing "banner" matches CTA Banner).
- **Favorites filter:** Click the star button to show only elements with `is_favorite: true`.
- Both filters work together -- you can search within favorites.
- Filtered results maintain the original sort order within each folder.

---

## Asset Library and Element Marketplace

### Asset Library

- Click the **Asset Library** button at the top of the Elements panel.
- Opens the `AssetLibraryModal` component.
- Browse and upload media assets (images, videos, audio files) that can be used across elements.
- Assets can be filtered by type when opened from a specific element context.

### Element Marketplace

- Click the **Element Marketplace** button.
- Opens the `ElementMarketplace` modal.
- Browse community-created elements and overlay templates.
- Install elements directly into your room.

---

## Common Troubleshooting

### Q: I created an element but it does not appear on the stage.
**A:** Creating an element adds it to the elements list but does not activate it. Click the element card to activate it. The element will then render on the live stage. Only one element per type can be active at a time.

### Q: I cannot drag elements to reorder them.
**A:** Ensure you are grabbing the grip handle icon on the far left of the element row. The drag handle is a small vertical dots icon. Dragging from other parts of the element row will not initiate a drag operation.

### Q: My presentation element opens a file picker when I click it.
**A:** This should not happen. Clicking a presentation element card starts playback if it has a file already configured. To change the file, use the three-dot menu and select "Edit" to open the configuration modal. If you see a file picker, ensure you are clicking the element card itself and not a system-level file input.

### Q: I duplicated an element but the copy has the same name.
**A:** Duplicated elements automatically get "(Copy)" appended to the original name. If you see a duplicate without this suffix, try refreshing the elements panel.

### Q: How do I move an element to a different folder?
**A:** Click the three-dot menu on the element, hover over "Move to", and select the destination folder from the submenu. The element will immediately appear in the new folder.

### Q: Can I have multiple active polls at the same time?
**A:** No. The `activeElements` system allows only one active element per type. Activating a new poll will replace the currently active poll. To run sequential polls, deactivate the current poll first, then activate the next one.

### Q: What is the Element Marketplace?
**A:** The Element Marketplace is a built-in store where you can browse and install community-created elements and overlay templates. It is accessed via the "Element Marketplace" button at the top of the Elements panel.

### Q: How do Rally overlays differ from regular elements?
**A:** Rally overlays are specialized Web3/blockchain components (price trackers, NFT showcases, token drops, etc.) managed through the `OverlayManager` system rather than the standard element activation system. They are stored as `UserOverlay` entities, are draggable on the stage, and support individual positioning, styling, and customization. They are added via the `RallyOverlaysPanel`.

---

## API Reference

### Element Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique element identifier |
| `type` | string | Element type (e.g., `'cta'`, `'poll'`, `'video'`) |
| `name` | string | Display name |
| `folder_id` | string | Parent folder ID |
| `room_id` | string | Room this element belongs to |
| `data` | object | Type-specific configuration data |
| `is_favorite` | boolean | Whether the element is favorited |
| `order` | number | Sort position within folder (0-based) |

### Element Operations

```
// Create element
onCreateElement({ type, name, folder_id, data, room_id })

// Edit element
onEditElement(elementId, element)

// Rename element
onRenameElement(elementId, element, newName)

// Duplicate element
onDuplicateElement(elementId, element)  // Creates copy with "(Copy)" suffix

// Delete element
onDeleteElement(elementId)

// Move to folder
onMoveElement(elementId, targetFolderId)

// Toggle favorite
onToggleFavorite(elementId, currentIsFavorite)

// Reorder elements
onReorderElements([{ id, order }, ...])

// Activate element
onActivateElement(element)  // Sets activeElements[type] = element

// Deactivate element
onDeactivateElement(element)  // Removes activeElements[type]
```

### UserOverlay Entity (Rally Overlays)

```
UserOverlay.create({
  room_id: 'room_123',
  template_id: 'price_tracker',
  custom_config: { name: 'RLY Price Tracker', type: 'price_tracker' },
  position: { x: 100, y: 100, width: 300, height: 200 },
  styling: {
    font_family: 'Inter',
    font_size: 14,
    font_weight: 'medium',
    text_color: '#ffffff',
    secondary_text_color: '#9ca3af',
    accent_color: '#6E3FF3',
    background_color: '#001233',
    background_opacity: 95,
    border_enabled: true,
    border_width: 1,
    border_color: '#ffffff',
    border_opacity: 10,
    border_radius: 16,
    shadow_enabled: true,
    shadow_intensity: 'lg'
  },
  is_visible: true,
  z_index: 1000
})
```

---

## Related Features

- **Overlays and Scenes:** Active elements render as overlays on the stage. See `14-studio-overlays-scenes.md`.
- **Polls and Q&A:** Polls are an element type but also have dedicated management panels. See `12-studio-polls-qa.md`.
- **Chat Commands:** Viewers can trigger certain elements via chat commands. See `13-studio-chat.md`.
- **Streaming:** Active elements are visible to viewers on all streaming platforms. See `15-studio-streaming.md`.
- **Recording:** Active elements are captured in recordings. See `16-studio-recording.md`.
