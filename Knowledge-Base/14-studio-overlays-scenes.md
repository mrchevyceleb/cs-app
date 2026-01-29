# 14 - Studio Overlays and Scenes

## Overview

The R-Link Studio Overlays and Scenes system controls the visual composition of live sessions. Overlays are dynamic visual elements layered on top of the video stage (talking points, CTAs, featured comments, Q&A displays, stream decorations, and Rally/Web3 overlays). Scenes define the spatial arrangement of participants, screen shares, and media sources on the stage canvas. Together, they enable hosts to create professional broadcast-quality productions with multiple layouts, visual effects, and interactive elements. The system is managed through the `OverlayManager`, `LayoutCanvasEditor`, `StagePanel`, and related components.

---

## Accessing Overlays and Scenes

1. Enter any R-Link Studio session.
2. **Overlays** are managed through:
   - The **Elements Tab** (left sidebar) -- activate overlay-type elements.
   - The **OverlayManager** -- automatically renders active overlays on the stage.
   - The **RallyOverlaysPanel** -- add and manage Web3/Rally overlays.
3. **Scenes** are managed through:
   - The **Layout Switcher** bar (below the stage or in the bottom controls).
   - The **LayoutCanvasEditor** -- renders the current scene layout on the stage.
   - The **AdvancedSceneManager** -- advanced scene configuration with transitions.
   - The **StagePanel** -- add/remove participants and media from the stage.

---

## Overlay Types

### 1. Talking Point Overlay

The `TalkingPointOverlay` component renders a full-width lower-third bar at the bottom of the stage.

#### Rendering

- **Position:** Absolute bottom of the stage (`bottom-0 left-0 right-0`), z-index 50.
- **Appearance:** Full-width gradient bar using session branding colors.
- **Content:** Optional emoji icon + text message.
- **Animation:** Slides up from below (`y: 60` to `y: 0`) with 300ms ease-out transition. Exits by sliding back down.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `talkingPoint.text` | string | Main display text |
| `talkingPoint.icon` | string | Optional emoji/icon displayed before the text |
| `talkingPoint.auto_hide_ms` | number | Auto-dismiss timer in milliseconds. 0 = manual dismiss only. |

#### Auto-Hide Behavior

1. When `auto_hide_ms > 0`, a timeout is set for that duration.
2. After the timeout, `isVisible` is set to false, triggering the exit animation.
3. After the exit animation completes (300ms), the `onAutoHide` callback fires.
4. If a new talking point is set before the timer expires, the timer resets.

#### Branding Integration

The overlay uses session branding values:
- `font` -- Font family (default: `'Inter'`).
- `primaryColor` -- Gradient start color (default: `'#6a1fbf'`).
- `accentColor` -- Gradient end color (default: `'#00c853'`).
- `backgroundColor` -- Fallback background (default: `'#001233'`).

Text renders as white (`#ffffff`) with `text-xl md:text-2xl` sizing and `font-medium` weight.

---

### 2. CTA Overlay (`activeCTA`)

Call-to-action banners that appear on the stage when a CTA element is activated.

- **Activation:** Set via `activeElements.cta` in the element system.
- **Display:** Banner overlay with customizable text, button, and link.
- **Branding:** Uses session primary and accent colors.
- **Z-index:** Managed by the overlay layer system.

---

### 3. Stream Overlays

The `StreamOverlayRenderer` component handles decorative and informational overlays during streaming:

- Custom overlay graphics and frames.
- Lower-third graphics.
- Bug/watermark logos.
- Custom HTML/CSS overlays via the `CustomOverlayEditor`.

---

### 4. Featured Comment Overlay

The `FeaturedCommentOverlay` component displays a highlighted chat message on the stage.

#### Rendering

- **Position:** Absolute bottom-left of the stage (`bottom-20 left-6`), z-index 50.
- **Appearance:** Rounded card with gradient background, user avatar, name, and message text.
- **Animation:** Slides in from the left (`x: -40` to `x: 0`) with 300ms ease-out transition.
- **Interaction:** Clicking the overlay calls `onUnfeature` to remove it.

#### Content

| Element | Description |
|---------|-------------|
| **Avatar** | 48x48px rounded circle. Uses `comment.avatar` URL if available, otherwise shows initial letter with user's color. |
| **User name** | Bold white text, `text-base` size. |
| **Message** | White text at 95% opacity, `text-sm`, max 2 lines with `line-clamp-2`. |
| **Background** | `linear-gradient(135deg, primaryColor, accentColor)` with `ee` opacity suffix and backdrop blur. |

---

### 5. Q&A Display Overlay

The `QADisplayOverlay` component renders audience questions prominently on the stage.

#### Rendering

- **Position:** Fixed bottom-center of the viewport (`fixed bottom-24 left-1/2 -translate-x-1/2`), z-index 30.
- **Appearance:** Purple-to-indigo gradient card with purple border accent.
- **Max width:** `max-w-2xl` (672px).
- **Animation:** Slides up from below (`y: 50` to `y: 0`).

#### Content

| Element | Description |
|---------|-------------|
| **Header** | "Question from Audience" title with purple MessageSquare icon |
| **Asker name** | Purple-tinted text showing who asked the question |
| **Question text** | White text, `text-lg` size, in a dark bordered box |
| **Upvote count** | Shows number of upvotes if > 0 (arrow emoji + count) |
| **Close button** | X button for the host to dismiss the question |

---

### 6. Rally/Web3 Overlays (11 Types)

Managed by the `OverlayManager` component, Rally overlays are draggable widgets on the stage.

#### Available Rally Overlay Types

| Type | Component | Description |
|------|-----------|-------------|
| `price_tracker` | `RLYPriceTracker` | Live RLY token price with chart |
| `leaderboard` | `TokenLeaderboard` | Top token holders ranking |
| `token_drop` | `TokenRewardDrop` | Animated token reward drops |
| `nft_showcase` | `NFTShowcase` | NFT collection gallery |
| `rally_badge` | `RallyBadge` | "Powered by Rally" branding |
| `token_balance` | `TokenBalance` | Wallet token balance display |
| `wallet_status` | `WalletStatus` | Wallet connection indicator |
| `mint_counter` | `MintCounter` | NFT minting progress |
| `gas_tracker` | `GasTracker` | Current gas fees |
| `volume_display` | `VolumeDisplay` | Trading volume metrics |
| `community_stats` | `CommunityStats` | Community engagement stats |
| `staking_rewards` | `StakingRewards` | Staking reward tracking |

#### Overlay Manager System

The `OverlayManager` component handles rendering and interaction for all Rally overlays:

1. **Data source:** Fetches `UserOverlay` entities filtered by `room_id` and `is_visible: true`.
2. **Rendering:** Each overlay renders at its absolute position (`left: x px`, `top: y px`) with its `z_index`.
3. **Component mapping:** Uses `OVERLAY_COMPONENTS` map to look up the React component for each `template.overlay_type`.
4. **Drag-and-drop:** Overlays are draggable on the stage:
   - `mouseDown` on an overlay starts dragging, capturing the offset.
   - `mouseMove` updates the overlay position in real time (optimistic local update).
   - `mouseUp` persists the new position to the database via `UserOverlay.update`.
5. **Controls:** Each overlay has floating buttons:
   - **Settings** (purple gear icon) -- Opens the `OverlayCustomizationModal` for styling.
   - **Close** (red X icon) -- Sets `is_visible: false` to hide the overlay.

#### Overlay Customization

The `OverlayCustomizationModal` provides per-overlay styling controls:

| Setting | Type | Description |
|---------|------|-------------|
| `font_family` | string | Font selection (default: Inter) |
| `font_size` | number | Text size in pixels |
| `font_weight` | string | Text weight (e.g., medium) |
| `text_color` | string | Primary text color |
| `secondary_text_color` | string | Secondary/label text color |
| `accent_color` | string | Highlight/accent color |
| `background_color` | string | Background color |
| `background_opacity` | number | Background opacity (0-100) |
| `border_enabled` | boolean | Show/hide border |
| `border_width` | number | Border thickness in pixels |
| `border_color` | string | Border color |
| `border_opacity` | number | Border opacity (0-100) |
| `border_radius` | number | Corner radius in pixels |
| `shadow_enabled` | boolean | Show/hide drop shadow |
| `shadow_intensity` | string | Shadow size: `'sm'`, `'md'`, `'lg'`, `'xl'` |

---

### 7. Enhanced Overlay Manager

The `EnhancedOverlayManager` provides additional overlay management features beyond the base `OverlayManager`:

- Extended overlay types.
- Grouping and layering controls.
- Overlay presets and templates.

---

### 8. Overlay Marketplace and Packs

- **OverlayMarketplace:** Browse community-created overlay templates.
- **OverlayPacksModal:** Install themed overlay collections.

---

### 9. Web Overlay Renderer

The `WebOverlayRenderer` component embeds external web pages as iframes on the stage:

- Supports any URL.
- Configurable dimensions and position.
- Opacity control.
- Used when `web_overlay` elements are activated.

---

### 10. Celebration Overlay

The `CelebrationOverlay` component renders animated effects triggered by chat commands or host actions:

- Confetti, fireworks, hearts, and other particle effects.
- Triggered by `!confetti`, `!fireworks`, `!hearts` chat commands.
- Full-screen overlay with timed auto-dismiss.

---

## Active Overlays Array

The studio maintains an `activeOverlays` array tracking all currently visible overlays:

```
activeOverlays = [
  { type: 'talking_point', data: {...}, id: '...' },
  { type: 'featured_comment', data: {...}, id: '...' },
  { type: 'qa_display', data: {...}, id: '...' },
  { type: 'cta', data: {...}, id: '...' },
  { type: 'stream_overlay', data: {...}, id: '...' }
]
```

Overlays are added when activated and removed when deactivated. The rendering layer iterates over this array to display all active overlays on the stage.

---

## Scenes and Layouts

### LayoutCanvasEditor

The `LayoutCanvasEditor` component is the primary scene renderer for the R-Link Studio. It renders the current layout with all stage participants and screen shares.

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `layout` | string | Current layout name |
| `stageItems` | array | Participants and media currently on stage |
| `isScreenSharing` | boolean | Whether screen sharing is active |
| `screenStream` | MediaStream | Screen share stream (if active) |
| `sceneImages` | object | Background images for scenes |

#### Available Layouts

| Layout | Description | Grid Structure |
|--------|-------------|----------------|
| `solo` | Single centered participant (16:9) | 1 video, 80% width, max 1200px |
| `dual-horizontal` | Two side-by-side participants | 2-column grid, 90% width, max 1400px |
| `cropped` | Single portrait participant (9:16) | 1 video, 40% width, max 600px |
| `news` | Person (9:16) + content (16:9) | 2-column: 1fr + 2fr, 95% width |
| `three-person` | Three side-by-side participants | 3-column grid, 95% width |
| `spotlight` | One large + thumbnails sidebar | Main + sidebar layout |
| `screen` | Screen share primary layout | Screen share focused |
| `demo-screen` | Screen share with presenter PIP | Screen share + picture-in-picture |
| `pip` | Picture-in-picture | Main video + small overlay |
| `cinema` | Cinematic wide format | Ultra-wide aspect ratio |

#### Keyboard Shortcuts

Layouts can be quickly switched using keyboard shortcuts:
- **Shift+1** through **Shift+9** maps to the layouts in order:
  1. Solo
  2. Dual Horizontal
  3. Cropped
  4. Three Person
  5. News
  6. Screen
  7. Demo Screen
  8. PIP
  9. Cinema

#### Empty Stage

When no items are on stage (`stageItems.length === 0`), the canvas displays:
- Large user icon (placeholder).
- "No participants on stage" message.
- "Add people or media from Stage Manager below" instruction.

---

### Stage Panel (addToStage / removeFromStage)

The `StagePanel` component manages which participants and media sources appear on the stage.

#### Adding to Stage

- Click "Add to Stage" on a participant or media source.
- The item is added to the `stageItems` array.
- The `LayoutCanvasEditor` re-renders with the new item.
- Layout auto-adjusts based on the number of stage items.

#### Removing from Stage

- Click "Remove from Stage" on an active stage item.
- The item is removed from the `stageItems` array.
- The layout re-adjusts to accommodate the remaining items.

---

### Advanced Scene Manager

The `AdvancedSceneManager` component provides professional scene management features:

- **Scene presets** -- Save and load custom scene configurations.
- **Scene transitions** -- Configure transition effects between scene switches.
- **Scene scheduling** -- Pre-program scene switches for automated broadcasts.
- **Macro Manager** -- Create macro commands that trigger multiple scene changes and actions.

---

### Scene Layer Editor

The `SceneLayerEditor` component provides layer-based editing for scene composition:

- Z-order management for overlapping elements.
- Per-layer visibility controls.
- Layer grouping and locking.

---

### Layout Presets

The `LayoutPresetsModal` provides pre-configured layout templates:

- Quick-apply common layout combinations.
- Save custom layouts as presets.
- Share presets between rooms.

---

### Custom Layout Builder

The `CustomLayoutBuilder` and `DynamicGridEditor` components enable freeform layout creation:

- Drag and resize video tiles to custom positions.
- Create asymmetric layouts.
- Save custom layouts for reuse.

---

## Scene Audio

Each scene can have its own audio configuration:

| Property | Type | Description |
|----------|------|-------------|
| `audioTrackId` | string | ID of the audio track assigned to this scene |
| `volume` | number | Volume level (0-100) |
| `fadeIn` | number | Fade-in duration in milliseconds when scene becomes active |
| `fadeOut` | number | Fade-out duration in milliseconds when scene transitions out |

Scene audio allows different background music or audio beds for different layouts. When switching scenes, the audio fades out from the previous scene and fades in to the new scene's audio track, providing smooth professional transitions.

---

### Scene Visibility

The studio tracks `sceneVisibility` state to control which scene elements are visible:

```
sceneVisibility = {
  overlays: true,       // Show/hide all overlays
  chat: true,           // Show/hide chat overlay
  captions: true,       // Show/hide captions overlay
  branding: true,       // Show/hide branding elements
  watermark: true       // Show/hide watermark
}
```

### Current Scene

The `currentScene` state tracks the active layout configuration:

```
currentScene = {
  layout: 'dual-horizontal',
  background: '#001233',
  backgroundImage: 'url(...)',
  overlays: ['talking_point', 'cta'],
  audioTrackId: 'track_123',
  volume: 80,
  fadeIn: 500,
  fadeOut: 300
}
```

### Scene Images

The `sceneImages` object maps scene IDs to background images:

```
sceneImages = {
  scene_1: 'https://...background1.jpg',
  scene_2: 'https://...background2.jpg',
  default: 'https://...default.jpg'
}
```

---

## Layout Navigation

### LayoutSwitcherBar

The `LayoutSwitcherBar` component provides quick layout switching via a horizontal bar of layout thumbnails:

- Displays all available layouts as small preview icons.
- Current layout is highlighted.
- Click a layout to switch immediately.
- Supports keyboard shortcuts (Shift+1-9).

### LayoutNavigationBar

The `LayoutNavigationBar` provides an alternative navigation interface for scene/layout management:

- Tabbed interface for organizing layouts by category.
- Drag-to-reorder layout order.
- Quick-access to layout settings.

### Layouts Sidebar

The `LayoutsSidebar` provides a full sidebar view for detailed layout management:

- All available layouts with previews.
- Layout settings and customization.
- Scene transition configuration.

---

## AI Overlay Assistant

The `AIOverlayAssistant` component in the streaming directory provides AI-powered overlay suggestions:

- Analyzes session context (topic, audience, engagement).
- Suggests appropriate overlays to display.
- Recommends overlay timing and placement.
- Connected to the `aiOverlayService` for intelligent overlay management.

---

## Common Troubleshooting

### Q: My overlay is not visible on the stage.
**A:** Ensure the element is activated (purple highlight in the Elements panel). Check that the session is in live/preview mode. Verify the overlay's z-index is not behind other elements. For Rally overlays, confirm `is_visible` is set to true in the OverlayManager.

### Q: I cannot drag Rally overlays to reposition them.
**A:** Rally overlays are draggable by clicking and dragging anywhere on the overlay widget (not just the header). Ensure you are clicking on the overlay itself, not the settings or close buttons. If the overlay seems stuck, try refreshing the page -- the position persists in the database.

### Q: The featured comment overlay is not showing.
**A:** The featured comment overlay requires: (1) a message to be featured via the star icon in chat, (2) the `FeaturedCommentOverlay` component to be rendered in the stage layout, (3) the `onFeatureComment` callback to be properly connected. Check the chat panel to confirm the star icon is highlighted (yellow fill) for the featured message.

### Q: Scene transitions are not smooth.
**A:** Scene audio transitions use `fadeIn` and `fadeOut` durations. If these are set to 0, transitions are instant (no fade). Set `fadeIn` and `fadeOut` to 300-500ms for smooth transitions. For video layout transitions, the system uses Framer Motion with default animation settings.

### Q: How do I change the layout during a live session?
**A:** Use the Layout Switcher bar (below the stage) to click a different layout. Alternatively, use keyboard shortcuts Shift+1 through Shift+9. The layout changes immediately and is visible to all viewers. If Auto Scene Switching is enabled, the layout may change automatically based on participant count.

### Q: I want different backgrounds for different scenes.
**A:** Use the `sceneImages` configuration to assign background images to specific scenes. Access this through the Advanced Scene Manager or Layout Settings panel. Each scene can have its own background image URL.

### Q: How do I add background music to a scene?
**A:** Configure scene audio by setting the `audioTrackId`, `volume`, `fadeIn`, and `fadeOut` properties for each scene. Audio tracks can be uploaded through the Asset Library or Elements panel (audio element type). Each scene independently controls which audio plays and at what volume.

### Q: Overlays are overlapping and hard to see.
**A:** Adjust overlay z-indexes through the Scene Layer Editor. Higher z-index values appear on top. For Rally overlays, use the `z_index` property in the OverlayCustomizationModal. Consider reducing the number of simultaneous overlays for a cleaner presentation.

### Q: The Talking Point overlay covers other content.
**A:** The Talking Point overlay renders as a full-width lower-third at z-index 50. It intentionally covers the bottom of the stage. Use the `auto_hide_ms` setting to automatically dismiss it after a set duration. Alternatively, manually deactivate the talking point element when no longer needed.

### Q: How do I customize Rally overlay colors and fonts?
**A:** Click the purple gear icon on any Rally overlay to open the Overlay Customization Modal. From there, adjust font family, font size, text colors, accent color, background color/opacity, border settings, corner radius, and shadow intensity. Changes persist to the database immediately.

---

## API Reference

### UserOverlay Entity (Rally Overlays)

```
{
  id: string,
  room_id: string,
  template_id: string,          // Overlay type identifier
  custom_config: {
    name: string,
    type: string                // Matches template_id
  },
  position: {
    x: number,                  // Left offset in pixels
    y: number,                  // Top offset in pixels
    width: number,              // Widget width
    height: number              // Widget height
  },
  styling: {
    font_family: string,
    font_size: number,
    font_weight: string,
    text_color: string,
    secondary_text_color: string,
    accent_color: string,
    background_color: string,
    background_opacity: number,
    border_enabled: boolean,
    border_width: number,
    border_color: string,
    border_opacity: number,
    border_radius: number,
    shadow_enabled: boolean,
    shadow_intensity: string    // 'sm' | 'md' | 'lg' | 'xl'
  },
  is_visible: boolean,
  z_index: number
}
```

### Scene State

```
currentScene = {
  layout: string,               // Layout name
  background: string,           // Background color
  backgroundImage: string,      // Background image URL
  overlays: string[],           // Active overlay type list
  audioTrackId: string,         // Scene audio track ID
  volume: number,               // 0-100
  fadeIn: number,               // Fade-in ms
  fadeOut: number               // Fade-out ms
}
```

### Layout Options

```
layouts = [
  'solo', 'dual-horizontal', 'cropped', 'three-person',
  'news', 'screen', 'demo-screen', 'pip', 'cinema', 'spotlight'
]
```

### Overlay Operations

```
// Feature a chat comment
onFeatureComment(message)    // Pass message object to display
onFeatureComment(null)       // Remove featured comment

// Display Q&A question
onDisplayQuestion(question)  // Shows QADisplayOverlay

// Activate CTA
activeElements.cta = element // Shows CTA overlay

// Toggle overlay visibility (Rally)
UserOverlay.update(id, { is_visible: true/false })

// Update overlay position (Rally)
UserOverlay.update(id, { position: { x, y } })

// Customize overlay styling (Rally)
UserOverlay.update(id, { styling: { ... } })
```

---

## Related Features

- **Elements:** Elements activate as overlays on the stage. See `10-studio-elements.md`.
- **Chat:** Featured comments and chat commands trigger overlays. See `13-studio-chat.md`.
- **Polls and Q&A:** Poll and Q&A displays render as stage overlays. See `12-studio-polls-qa.md`.
- **Streaming:** All overlays and scenes are encoded in the stream output. See `15-studio-streaming.md`.
- **Recording:** Active overlays and scenes are captured in recordings. See `16-studio-recording.md`.
