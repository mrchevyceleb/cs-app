# Studio Overlays and Scenes System

## Overview

The R-Link Studio Overlays and Scenes system provides hosts with powerful tools for layering visual content on top of the live stage and organizing multi-scene productions. Overlays include Talking Points, Calls-to-Action (CTA), Stream Overlays, Featured Comments, and Q&A Display -- all managed through the `OverlayManager` and tracked in the `activeOverlays` state array. The Scenes system, primarily used in Live Stream mode, allows hosts to create and switch between multiple visual layouts using `LayoutCanvasEditor`, manage stage items through `StagePanel`, and configure per-scene audio settings. Together, overlays and scenes give hosts full creative control over their broadcast output.

## Overlay Types

### TalkingPointOverlay
- **Components:** `TalkingPointOverlay` (renderer), `TalkingPointModal` (configuration)
- **Purpose:** Display key talking points or bullet points on the live stage to guide the host and inform the audience
- **Use case:** Structured presentations, agenda items, keynote highlights, discussion topics
- **Behavior:** Renders text content as an overlay on the stage; hosts control when talking points appear and disappear
- **Configuration:** Set the talking point text, visual style, position, and display duration in `TalkingPointModal`

### CTAOverlay (Call-to-Action)
- **Components:** `CTAOverlay` (renderer), `CTAModal` (configuration)
- **State:** `activeCTA` -- holds the currently active CTA object
- **Purpose:** Display a call-to-action banner or button overlay on the stage to drive viewer engagement
- **Use case:** "Sign up now," "Visit our website," "Use code SAVE20," product purchase links
- **Behavior:**
  - When a CTA is activated, the `activeCTA` state is set to the CTA configuration object
  - The `CTAOverlay` renders the CTA on the live stage with text, links, and optional styling
  - Deactivating the CTA sets `activeCTA` to `null`
- **Configuration:** Set CTA text, URL/link, button text, visual style, and position in `CTAModal`

### StreamOverlayRenderer
- **Component:** `StreamOverlayRenderer`
- **Purpose:** Render custom visual overlays on the stream output, including branding elements, lower thirds, logos, and custom graphics
- **Managed by:** `OverlayManager`
- **Behavior:** Processes and renders overlays from the `activeOverlays` array onto the stream video output
- **Use case:** Brand watermarks, lower-third name bars, custom graphics, sponsor logos

### FeaturedCommentOverlay
- **Component:** `FeaturedCommentOverlay`
- **State:** `featuredComment` -- holds the currently featured chat message
- **Purpose:** Highlight a specific chat message on the live stage so all viewers (including external stream viewers) can see it
- **Behavior:**
  - When a host features a chat message, the `featuredComment` state is set to that message object
  - The `FeaturedCommentOverlay` renders the commenter's name and message content in a styled overlay
  - The overlay is visible on the live stage and burned into any active stream output
  - Clearing the feature sets `featuredComment` to `null`
- **Use case:** Highlighting audience questions, showcasing positive comments, acknowledging viewers

### QADisplayOverlay
- **Component:** `QADisplayOverlay`
- **State:** `displayedQuestion` -- holds the currently displayed Q&A question
- **Purpose:** Display a selected Q&A question prominently on the live stage
- **Behavior:**
  - When a host selects a question to display, the `displayedQuestion` state is set
  - The `QADisplayOverlay` renders the question text and asker's name on the stage
  - The overlay is visible to all participants and stream viewers
  - Clearing the display sets `displayedQuestion` to `null`
- **Use case:** Q&A segments, audience question highlights, panel discussions

## OverlayManager

### Overview
The `OverlayManager` is the central component responsible for coordinating all active overlays on the stage. It manages the rendering order, positioning, and lifecycle of overlays.

### activeOverlays State
The `activeOverlays` state is an array that tracks all currently active overlays:

```
activeOverlays: [
  { type: "talking_point", id: "tp_1", data: { text: "Key Point #1", ... } },
  { type: "cta", id: "cta_1", data: { text: "Sign Up Now", url: "...", ... } },
  { type: "featured_comment", id: "fc_1", data: { user: "John", message: "...", ... } },
  { type: "qa_display", id: "qa_1", data: { question: "...", asker: "Jane", ... } },
  { type: "stream_overlay", id: "so_1", data: { imageUrl: "...", position: "bottom-left", ... } }
]
```

### Managing Overlays
1. **Activating an overlay:** Add an overlay object to the `activeOverlays` array
2. **Deactivating an overlay:** Remove the overlay object from the `activeOverlays` array
3. **Updating an overlay:** Replace the overlay object in the array with updated data
4. **Rendering:** The `OverlayManager` iterates through `activeOverlays` and renders each overlay using the appropriate component (`TalkingPointOverlay`, `CTAOverlay`, `FeaturedCommentOverlay`, `QADisplayOverlay`, `StreamOverlayRenderer`)

### Overlay Layering
- Multiple overlays can be active simultaneously
- Overlays are layered on top of the stage content in the order they appear in the `activeOverlays` array
- Positioning of each overlay is determined by its configuration (top, bottom, left, right, center, etc.)
- Care should be taken to avoid overlapping overlays that obscure important content

## Using Overlays Step-by-Step

### Activating a Talking Point
1. Open the **Overlays** section in the Studio sidebar
2. Click **"Talking Point"** or open the `TalkingPointModal`
3. Enter the talking point text and configure visual options
4. Click **"Activate"** to display the talking point on stage
5. The talking point appears on the live stage and in any active streams

### Activating a Call-to-Action (CTA)
1. Open the **Overlays** section or the CTA panel
2. Click **"Add CTA"** or open the `CTAModal`
3. Configure the CTA:
   - **Text:** The main CTA message (e.g., "Visit our store!")
   - **URL:** The target link
   - **Button text:** The action button label (e.g., "Shop Now")
   - **Style:** Visual styling options
4. Click **"Activate"** to set the `activeCTA` state and display on stage
5. To remove, click **"Deactivate"** to set `activeCTA` to `null`

### Featuring a Chat Comment
1. Browse the chat feed in the Chat panel
2. Find the message you want to feature
3. Click the **"Feature"** button on the message
4. The `featuredComment` state is set and the `FeaturedCommentOverlay` renders on stage
5. To remove, click **"Unfeature"** or feature a different message

### Displaying a Q&A Question
1. Open the **Q&A** panel in the Studio
2. Browse submitted questions
3. Click **"Display on Stage"** for the desired question
4. The `displayedQuestion` state is set and the `QADisplayOverlay` renders on stage
5. To remove, click **"Hide from Stage"** to clear the displayed question

## Scenes System (Live Stream Mode)

### Overview
The Scenes system is a core feature of Live Stream session mode, allowing hosts to pre-configure multiple visual layouts and switch between them during a broadcast. In Live Stream mode, the standard `VideoCanvas` is replaced by `LayoutCanvasEditor`, providing a more flexible canvas for scene composition.

### Key State Properties

| State | Type | Description |
|-------|------|-------------|
| `currentScene` | String/Number | Identifier for the currently active scene |
| `sceneImages` | Object | Mapping of scene IDs to their preview thumbnails/images |
| `sceneVisibility` | Object | Mapping of scene IDs to their visibility status (shown/hidden) |

### Scene Components

#### LayoutCanvasEditor
- Replaces `VideoCanvas` in Live Stream mode
- Provides a drag-and-drop canvas editor for composing scene layouts
- Hosts can position and resize video feeds, overlays, images, and other visual elements on the canvas
- Each scene has its own independent layout configuration
- Changes to one scene do not affect other scenes

#### LayoutSwitcherBar
- Displays a horizontal bar of scene thumbnails/buttons for quick switching
- Shows the `currentScene` highlighted
- Click a scene thumbnail to switch to that scene instantly
- May display scene preview images from the `sceneImages` state
- Supports reordering scenes by drag-and-drop

#### StagePanel
- Manages the items displayed on the current scene's stage
- Key functions:
  - **`addToStage(item)`**: Add a participant, media source, or element to the stage
  - **`removeFromStage(item)`**: Remove an item from the stage
  - **`addAvailableItem(item)`**: Register a new item as available for staging (e.g., a new participant joining)
- Provides a list of available items (participants, screen shares, media) and currently staged items
- Drag items from the available list to the stage, or use buttons to add/remove

### Scene Workflow

#### Creating a Scene
1. Open the **Scenes** panel or `LayoutSwitcherBar` in Live Stream mode
2. Click **"Add Scene"** to create a new scene
3. The new scene is added with a default empty layout
4. Use `LayoutCanvasEditor` to compose the scene layout:
   - Add video feeds (participants, screen shares)
   - Add overlays and graphics
   - Position and resize elements on the canvas
5. Optionally name the scene for easy identification

#### Switching Scenes
1. During a live session, use the `LayoutSwitcherBar` at the bottom/top of the Studio
2. Click on the target scene's thumbnail or button
3. The `currentScene` state updates to the new scene
4. The stage immediately transitions to the new scene's layout
5. All active streams reflect the scene change in real-time

#### Managing Scene Visibility
- The `sceneVisibility` state controls which scenes are visible in the `LayoutSwitcherBar`
- Hide scenes that are not currently needed to keep the switcher bar clean
- Hidden scenes are not deleted and can be made visible again at any time

### Scene Audio Configuration

#### handleSceneAudioChange
Each scene can have independent audio configuration. The `handleSceneAudioChange` function manages per-scene audio settings:

| Parameter | Type | Description |
|-----------|------|-------------|
| `audioTrackId` | String | Identifier for the audio track being configured |
| `volume` | Number | Volume level (0-100 or 0.0-1.0) |
| `fadeIn` | Number | Duration in milliseconds for audio to fade in when the scene becomes active |
| `fadeOut` | Number | Duration in milliseconds for audio to fade out when switching away from the scene |

#### Configuring Scene Audio
1. Select the scene you want to configure
2. Open the audio settings for that scene
3. For each audio track in the scene:
   - Set the **volume** level
   - Set the **fade-in** duration (how long audio takes to reach full volume when the scene activates)
   - Set the **fade-out** duration (how long audio takes to silence when switching away from the scene)
4. Save the audio configuration
5. When switching between scenes, audio fades in and out according to these settings, creating smooth transitions

### Stage Management with StagePanel

#### Adding Items to Stage
1. Open the **StagePanel** in the Studio
2. Browse the list of available items:
   - Participant video feeds
   - Screen shares
   - Media sources (cameras, capture cards)
   - Elements (videos, presentations)
3. Click **"Add to Stage"** or drag the item onto the stage canvas
4. The `addToStage(item)` function places the item on the current scene's layout
5. Position and resize the item using `LayoutCanvasEditor`

#### Removing Items from Stage
1. Select the item on the stage canvas or in the `StagePanel` list
2. Click **"Remove from Stage"** or drag it off the canvas
3. The `removeFromStage(item)` function removes the item from the current scene
4. The item returns to the available items list for potential future use

#### Adding Available Items
- When a new participant joins or a new media source becomes available, `addAvailableItem(item)` registers it
- The item appears in the `StagePanel`'s available items list
- It is not automatically added to any scene; the host must explicitly add it to the stage

## Settings and Options

| Setting | Description | Default |
|---------|-------------|---------|
| `activeOverlays` | Array of currently active overlay objects | `[]` (empty) |
| `activeCTA` | Currently active CTA configuration | `null` |
| `featuredComment` | Currently featured chat message | `null` |
| `displayedQuestion` | Currently displayed Q&A question | `null` |
| `currentScene` | Active scene identifier | First scene |
| `sceneImages` | Scene preview thumbnails | Auto-generated |
| `sceneVisibility` | Scene visibility in switcher bar | All visible |
| Scene audio `volume` | Per-track volume level | 100% |
| Scene audio `fadeIn` | Audio fade-in duration (ms) | 0 (instant) |
| Scene audio `fadeOut` | Audio fade-out duration (ms) | 0 (instant) |

## Troubleshooting

### Overlay not appearing on stage
1. Verify the overlay is in the `activeOverlays` array (check the Overlays panel for an active indicator)
2. Confirm the overlay is not positioned off-screen or behind another overlay
3. For `featuredComment` or `displayedQuestion`, verify the state is not `null`
4. Check if the stream is active -- some overlays only render on the stream output
5. Refresh the Studio page and reactivate the overlay

### Multiple overlays overlapping
1. Reposition overlays using their configuration modals to avoid overlap
2. Deactivate overlays that are no longer needed
3. Prioritize which overlays are most important and remove others
4. Adjust overlay sizing or positioning to accommodate multiple simultaneous overlays

### CTA not displaying
1. Check that `activeCTA` is not `null`
2. Verify the CTA was activated through the `CTAModal`, not just configured
3. Ensure the CTA text and URL are properly filled in
4. Try deactivating and reactivating the CTA

### Scene switch not working
1. Verify you are in **Live Stream** session mode (scenes are Live Stream-specific)
2. Check the `LayoutSwitcherBar` for available scenes
3. Ensure the target scene is not hidden (`sceneVisibility`)
4. Verify the target scene has a valid layout configured
5. Try clicking the scene button again; there may be a brief processing delay

### Scene audio not fading properly
1. Check the `fadeIn` and `fadeOut` values for the audio tracks in the scene
2. Values of 0 mean instant transitions (no fade)
3. Ensure the audio tracks have valid `audioTrackId` references
4. Verify the audio source is active and producing sound
5. Test with longer fade durations (e.g., 2000ms) to observe the effect more clearly

### LayoutCanvasEditor not responding
1. Ensure you are in Live Stream mode (LayoutCanvasEditor replaces VideoCanvas only in live mode)
2. Check for browser performance issues -- the canvas editor is resource-intensive
3. Try reducing the number of items on the stage
4. Refresh the page and re-enter the scene editor

### StagePanel shows no available items
1. Verify participants have joined the session with camera/microphone active
2. Check if media sources (cameras, screen shares) are available
3. The `addAvailableItem` function must register items before they appear
4. Refresh the StagePanel or the Studio page

## FAQ

**Q: Can I use overlays in Meeting and Webinar modes, or only Live Stream?**
A: Overlays (TalkingPoint, CTA, FeaturedComment, QADisplay, StreamOverlay) are available across all session types. The Scenes system (LayoutCanvasEditor, LayoutSwitcherBar, StagePanel, scene audio) is specific to Live Stream mode.

**Q: How many overlays can be active simultaneously?**
A: There is no hard limit on the number of items in the `activeOverlays` array. However, having too many overlays active at once can clutter the stage and confuse viewers. It is recommended to keep only 2-3 overlays active at any time.

**Q: What is the difference between VideoCanvas and LayoutCanvasEditor?**
A: `VideoCanvas` is used in Meeting and Webinar modes and provides a standard video grid layout. `LayoutCanvasEditor` is used in Live Stream mode and provides a flexible, drag-and-drop canvas where hosts can freely position and resize video feeds, graphics, and overlays anywhere on the stage.

**Q: Can I save and reuse scene layouts?**
A: Scene layouts are saved within the session configuration. Global folders and elements can be reused across sessions, but full scene layout presets may require recreating the layout in each new session.

**Q: How does scene audio fading work during transitions?**
A: When you switch from Scene A to Scene B, Scene A's audio fades out over its configured `fadeOut` duration, and Scene B's audio fades in over its configured `fadeIn` duration. This creates a smooth audio transition between scenes, preventing jarring audio cuts.

**Q: Can attendees see which scene is active?**
A: Attendees see the output of the active scene but do not see the scene switching interface, scene names, or the `LayoutSwitcherBar`. Scene management is host-only.

**Q: What items can be added to the stage?**
A: The `StagePanel` supports adding participant video feeds, screen shares, media sources (cameras, capture cards), and activated elements (videos, presentations, etc.) to the stage.

**Q: Can I use overlays during scene transitions?**
A: Yes. Overlays persist across scene transitions. Active overlays remain visible regardless of which scene is currently active, as they are layered on top of the scene content.

## Known Limitations

- The Scenes system (LayoutCanvasEditor, scene switching, scene audio) is only available in Live Stream session mode
- Only one CTA (`activeCTA`) can be active at a time; there is no CTA queue or rotation
- Only one featured comment (`featuredComment`) can be displayed at a time
- Only one Q&A question (`displayedQuestion`) can be shown on the overlay at a time
- Scene layout presets cannot be exported or shared between sessions as templates
- The `LayoutCanvasEditor` canvas is resource-intensive and may impact performance on lower-end devices
- Scene audio fade configuration applies to all listeners; per-viewer audio preferences are not supported
- `sceneImages` (preview thumbnails) may not update in real-time and could show stale previews
- Overlay positioning is fixed per configuration and does not dynamically adapt to different viewer screen sizes
- The `activeOverlays` array does not have built-in z-index management; overlay layering depends on array order
- Scene switching is instant in terms of visual transition; there are no built-in visual transitions (e.g., dissolve, wipe) between scenes -- only audio fading is supported

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| TalkingPointOverlay | Yes | Yes |
| CTAOverlay | Yes | Yes |
| FeaturedCommentOverlay | Yes | Yes |
| QADisplayOverlay | Yes | Yes |
| StreamOverlayRenderer (custom overlays) | Limited | Full |
| OverlayManager (multiple simultaneous) | Yes | Yes |
| Scenes system (Live Stream mode) | No | Yes |
| LayoutCanvasEditor | No | Yes |
| LayoutSwitcherBar | No | Yes |
| StagePanel management | No | Yes |
| Scene audio configuration (fade in/out) | No | Yes |
| Number of scenes per session | N/A | Multiple (plan-dependent) |

## Related Documents

- [00-index.md](00-index.md) -- Knowledge base index
- [10-studio-elements.md](10-studio-elements.md) -- Studio elements (activated on stage alongside overlays)
- [12-studio-polls-qa.md](12-studio-polls-qa.md) -- Polls and Q&A (QADisplayOverlay details)
- [13-studio-chat.md](13-studio-chat.md) -- Chat system (FeaturedCommentOverlay source)
- [15-studio-streaming.md](15-studio-streaming.md) -- Streaming (overlays appear on streams)
- [16-studio-recording.md](16-studio-recording.md) -- Recording (overlays captured in recordings)
