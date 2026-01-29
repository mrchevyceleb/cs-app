# Studio Interface

## Overview

The Studio is R-Link's core live session environment where hosts run Meetings, Webinars, and Live Streams. It is a full-screen web application composed of five primary regions: **TopBar** (session info and top-level controls), **LeftSidebar** (elements library and folders), **Main Canvas Area** (video feeds and layouts), **RightSidebar** (chat, Q&A, participants), and **BottomControls** (microphone, camera, screen share, recording, and session controls). The Studio interface adapts based on the active session type, showing different canvas renderers, layout options, and feature controls depending on whether the session is a Meeting, Webinar, or Live Stream.

This document provides a complete guide to every region, component, and behavior of the Studio interface, including responsive behavior for mobile devices and the extensive library of interactive elements, overlays, and production tools available to hosts.

---

## Studio Page Layout

The Studio uses a five-region layout structure:

```
+--------------------------------------------------+
|                    TopBar                         |
+--------+-------------------------------+---------+
|        |                               |         |
|  Left  |        Main Canvas            |  Right  |
| Sidebar|          Area                 | Sidebar |
|        |                               |         |
|        |                               |         |
+--------+-------------------------------+---------+
|                 BottomControls                    |
+--------------------------------------------------+
```

### Component Architecture

The Studio page imports and renders the following top-level components:

| Component | Position | Purpose |
|---|---|---|
| `TopBar` | Top edge | Session info, branding, top-level actions |
| `LeftSidebar` | Left edge | Elements library, folders, element management |
| `VideoCanvas` | Center (Meeting/Webinar) | Renders participant video feeds in the active layout |
| `LayoutCanvasEditor` | Center (Live Stream) | Advanced canvas with scene editing for live production |
| `RightSidebar` | Right edge | Chat, Q&A, participants list |
| `BottomControls` | Bottom edge | Primary session controls (mic, camera, share, record, live) |
| `LayoutSwitcherBar` | Below canvas or as floating bar | Quick layout switching buttons |
| `StagePanel` | Integrated with canvas (Live Stream) | Scene management and stage control |

---

## TopBar

### Purpose

The TopBar provides session-level information and top-level controls that persist throughout the session.

### Components and Controls

| Element | Description |
|---|---|
| Session name | Displays the room/session name (from `?name=` URL param or room config) |
| Session type indicator | Badge showing Meeting, Webinar, or Live Stream |
| Session timer | Elapsed time since session start |
| Live indicator | Red "LIVE" badge when streaming or "REC" badge when recording |
| Network status | Connection quality indicator |
| Settings gear | Opens session settings panel |
| Stream health | `StreamHealthMonitor` component showing stream metrics (Live Stream mode) |

---

## LeftSidebar

### Purpose

The LeftSidebar serves as the elements library and management panel. It provides access to all interactive elements, media assets, and overlays that can be added to the session.

### Default State

- **Starts collapsed** (`leftSidebarCollapsed: true` is the default state).
- Can be expanded by clicking the sidebar toggle button.
- **Auto-collapses on mobile** when the viewport width is less than 768px.

### Elements Library

The LeftSidebar provides access to the following element categories and their associated modals:

#### Core Media Elements

| Element | Modal Component | Stage Renderer | Description |
|---|---|---|---|
| Presentation | `PresentationElementModal` | `PresentationStageRenderer` | Upload and display slides |
| Video | `VideoElementModal` | `VideoStageRenderer` | Play video content |
| Audio | `AudioElementModal` | `AudioStageRenderer` | Play audio content |
| Image | -- | `ImageStageRenderer` | Display images on stage |
| Whiteboard | -- | `WhiteboardStageRenderer` | Interactive whiteboard |

#### Interactive Elements

| Element | Modal Component | Renderer | Description |
|---|---|---|---|
| Poll | `PollModal` | `PollStageRenderer` | Create and run polls |
| CTA | `CTAModal` | `CTAOverlay` | Call-to-action buttons and panels |
| Talking Points | `TalkingPointModal` | `TalkingPointOverlay` | Presenter talking points |
| Timer | `TimerElementModal` | `TimerStageRenderer` | Countdown/count-up timer |
| Web Overlay | `WebOverlayModal` | via `OverlayManager` | Embed external web content |
| Prompter | `PrompterElementModal` | `PrompterViewer` | Teleprompter for the presenter |

#### Commerce Elements

| Element | Modal Component | Renderer | Description |
|---|---|---|---|
| Product Showcase | `ProductShowcaseModal` | `ProductShowcaseRenderer` | Display products for sale |
| Checkout | `CheckoutModal` | `CheckoutRenderer` | In-session checkout flow |
| Lead Capture | `LeadCaptureModal` | `LeadCaptureRenderer` | Capture audience contact info |
| Auction | `AuctionModal` | `AuctionRenderer` | Live auction functionality |
| Contract | `ContractModal` | `ContractRenderer` / `ContractStageRenderer` | Digital contract signing |
| Merchandise | `MerchProductEditor` | `MerchStoreWidget` / `MerchFloatingOverlay` | Merch store and floating overlay |
| Tipping | -- | `TippingWidget` | Audience tipping during stream |

#### Gamification Elements

| Element | Modal Component | Renderer | Description |
|---|---|---|---|
| Leaderboard | `LeaderboardElementModal` | `LeaderboardStageRenderer` | Display participant rankings |
| Crypto Ticker | `CryptoTickerElementModal` | `CryptoTickerStageRenderer` | Live cryptocurrency prices |
| Rewards | -- | `RewardsPanel` | Reward system for engagement |

### Element Folders

| Component | Description |
|---|---|
| `ElementFolderModal` | Create and manage folders for organizing elements |
| `FolderSelectModal` | Select a folder when saving or moving an element |

Elements can be organized into folders for easy management, especially useful for hosts who use many elements across recurring sessions.

### Preview Modals

Several elements offer preview functionality before adding them to the stage:

| Preview Component | Description |
|---|---|
| `VideoPreviewModal` | Preview video content before adding to stage |
| `AudioPreviewModal` | Preview audio content before adding to stage |
| `PresentationPreviewModal` | Preview presentation slides |
| `PresentationShareModal` | Share presentation with participants |
| `TestPresentationViewer` | Test presentation rendering |

---

## Main Canvas Area

### Purpose

The Main Canvas Area is the central workspace where video feeds, layouts, elements, and overlays are rendered. The specific canvas component used depends on the session type.

### Canvas Components by Session Type

| Session Type | Canvas Component | Description |
|---|---|---|
| Meeting | `VideoCanvas` | Standard video grid/layout renderer |
| Webinar | `VideoCanvas` | Stage-focused video renderer with host emphasis |
| Live Stream | `LayoutCanvasEditor` | Advanced production canvas with scene editing |

### VideoCanvas (Meeting and Webinar)

The `VideoCanvas` component renders participant video feeds according to the active layout. It:
- Reads the current layout from `LayoutContext` (provided by `LayoutProvider`).
- Arranges video tiles according to the layout's region configuration.
- Handles dynamic participant addition/removal.
- Applies brand kit styling (backgrounds, lower-thirds, logos).

### LayoutCanvasEditor (Live Stream)

The `LayoutCanvasEditor` provides a more advanced canvas for live streaming with:
- Scene-based layout management.
- Drag-and-drop element positioning (in edit mode).
- Layer management for overlays and elements.
- Real-time preview of the stream output.
- Integration with `StagePanel` for scene switching.

### Layout Context

The `LayoutProvider` and `LayoutContext` manage layout state across the Studio:

| State | Description |
|---|---|
| Current layout | Active layout ID (e.g., `gallery`, `stage_host`, `live_host`) |
| Available layouts | Filtered by session type |
| Layout regions | Region configuration for the active layout |
| Layout transitions | Animation settings when switching layouts |

### LayoutSwitcherBar

The `LayoutSwitcherBar` component provides quick-access buttons for switching between available layouts:

- Displays thumbnail previews of each layout.
- Highlights the currently active layout.
- Shows only layouts available for the current session type.
- Can be positioned below the canvas or as a floating bar.
- Layout changes take effect immediately for all participants.

### StagePanel (Live Stream Only)

The `StagePanel` is exclusive to Live Stream mode and provides:

- Scene management (create, edit, delete, switch scenes).
- Scene transition controls.
- Media scene configuration.
- Pre-built scene templates.
- Integration with `AutomatedSceneSwitcher` for automatic transitions.

---

## RightSidebar

### Purpose

The RightSidebar provides communication and participant management tools during the session.

### Default State

- **Starts collapsed** (`rightSidebarCollapsed: true` is the default state).
- Can be expanded by clicking the sidebar toggle button.
- **Auto-collapses on mobile** when the viewport width is less than 768px.

### Panels and Tabs

| Tab/Panel | Description | Session Types |
|---|---|---|
| Chat | Real-time text chat between participants | All |
| Q&A | Question and answer panel for audience interaction | Webinar |
| Participants | List of participants with role indicators | All |
| Raised Hands | Queue of participants who raised their hands (`RaisedHandsQueue`) | All |

### Chat Features

| Feature | Component | Description |
|---|---|---|
| Chat messages | Built-in chat | Real-time messaging |
| Chat commands | `ChatCommandsProcessor` | Process slash commands in chat |
| AI Chat Insights | `AIChatInsights` | AI-powered chat analysis and summaries |

### Engagement Features

| Feature | Component | Description |
|---|---|---|
| Reactions | `EffectsOverlay` | Emoji reactions overlay on the canvas |
| Raised Hands | `RaisedHandsQueue` | Queue of participants requesting to speak |
| Engagement tracking | `useEngagement` hook | Track audience engagement metrics |

---

## BottomControls

### Purpose

The BottomControls bar contains the primary session controls that the host uses to manage audio, video, screen sharing, recording, and the live session state.

### Control Buttons

| Control | Icon | Action | Details |
|---|---|---|---|
| **Microphone** | Mic icon | Toggle mute/unmute | Shows current state (muted = red/crossed) |
| **Camera** | Camera icon | Toggle camera on/off | Shows current state (off = red/crossed) |
| **Screen Share** | Screen icon | Start/stop screen sharing | Opens share picker (entire screen, window, or tab) |
| **Record** | Record icon | Start/stop recording | Recording mode: local or cloud |
| **Go Live** | Broadcast icon | Start/stop live streaming | Opens `BroadcastModal` for stream configuration |
| **End Session** | End call icon | End the session for all participants | Confirmation dialog before ending |

### Recording Controls

| Setting | Options | Description |
|---|---|---|
| Recording mode | `local` / `cloud` | Local saves to host's device; cloud saves to R-Link storage |
| Multi-track recording | Enabled/disabled | `MultiTrackRecorder` records separate audio/video tracks |
| Multi-track status | `MultiTrackStatus` | Shows recording status for each track |

### Streaming Controls (Live Stream Mode)

| Component | Description |
|---|---|
| `BroadcastModal` | Configure streaming destinations (RTMP endpoints) |
| `BroadcastContainer` | Manages active broadcast connections |
| `StreamingConfigModal` | Advanced streaming settings (bitrate, resolution, etc.) |
| `ActiveStreamsPanel` | Shows status of all active stream outputs |
| `RTMPIngestModal` | Configure RTMP ingest for external sources |
| `MultiStreamManager` | Manage multiple simultaneous stream outputs |
| `NetworkMonitor` | Monitor network conditions during streaming |

### Additional Bottom Controls

| Control | Description |
|---|---|
| Guest Invite | `GuestInviteModal` -- invite guests to join the session |
| Breakout Rooms | `BreakoutRoomsModal` -- create and manage breakout rooms (Meeting mode) |
| Effects | Toggle reaction effects and overlays |
| More | Overflow menu for additional controls |

---

## Overlay and Renderer Components

### Overlays

Overlays are visual elements displayed on top of the canvas:

| Component | Description | Session Types |
|---|---|---|
| `CTAOverlay` | Call-to-action button/panel overlay | Webinar, Live Stream |
| `TalkingPointOverlay` | Talking points display for the presenter | Webinar, Live Stream |
| `OverlayManager` | Manages all active overlays | All |
| `StreamOverlayRenderer` | Renders overlays on the stream output | Live Stream |
| `FeaturedCommentOverlay` | Displays a featured comment on screen | Live Stream |
| `QADisplayOverlay` | Displays Q&A on screen | Webinar |
| `EffectsOverlay` | Emoji reactions floating on screen | All |
| `CelebrationOverlay` | Special celebration effects (confetti, etc.) | All |
| `MerchFloatingOverlay` | Floating merchandise promotion | Live Stream |

### Notification Components

| Component | Description |
|---|---|
| `PurchaseNotification` | Notifies host of purchases during session |
| `RewardNotification` | Notifies of reward events |

---

## Breakout Rooms (Meeting Mode)

### Components

| Component | Description |
|---|---|
| `BreakoutRoomsModal` | Create, configure, and manage breakout rooms |
| `BreakoutTimer` | Countdown timer for breakout sessions |
| `BreakoutBroadcastToast` | Toast notification when host broadcasts to all rooms |

### Behavior

- Available only in Meeting mode.
- Basic plan: 1 breakout room. Business plan: unlimited.
- Host can create multiple breakout rooms and assign participants.
- Timer can be set for automatic return to main session.
- Host can broadcast a message to all breakout rooms simultaneously.

---

## Translation and Accessibility

| Component | Description |
|---|---|
| `LiveTranscript` | Real-time transcription of spoken content |
| `LiveCaptions` | Live caption overlay for accessibility |
| `TextTranslator` | Translate text content in real-time |
| `TranslationService` | Backend service for translation functionality |

---

## Sidebar Behavior

### Default State

Both sidebars start in a **collapsed** state:

```
leftSidebarCollapsed: true   (default)
rightSidebarCollapsed: true  (default)
```

### Toggle Mechanism

- Each sidebar has a toggle button (usually a hamburger menu or arrow icon).
- Clicking the toggle expands or collapses the sidebar.
- When expanded, the sidebar overlays or pushes the canvas area (depending on screen size).

### Mobile Responsive Behavior

| Viewport Width | Behavior |
|---|---|
| >= 768px (desktop/tablet) | Sidebars can be expanded; they push the canvas area |
| < 768px (mobile) | Sidebars auto-collapse and overlay the canvas when expanded |

**Auto-collapse on mobile**: When the viewport width drops below 768px, both sidebars automatically collapse. This ensures the canvas area has maximum space on small screens. Sidebars can still be manually opened on mobile, but they will overlay the canvas rather than pushing it.

### Important for Support

If a customer reports that the sidebar "disappeared" or they "can't find the chat," check:
1. Whether the sidebar is simply collapsed (look for the toggle button).
2. Whether they are on a mobile device or small window (sidebar may have auto-collapsed).
3. Whether they can see the toggle icon to re-expand the sidebar.

---

## Session Type URL Parameters

The Studio reads URL parameters to configure the session:

| Parameter | Description | Values |
|---|---|---|
| `type` | Session type | `meeting`, `webinar`, `livestream` |
| `name` | Session display name | Any URL-encoded string |
| `room_id` | Room configuration to load | Room entity ID |

### Example URLs

```
/studio?type=meeting&name=Team%20Standup
/studio?type=webinar&name=Product%20Demo&room_id=abc123
/studio?type=livestream&name=Weekly%20Show&room_id=xyz789
```

---

## Studio State Management

### Core Session State

| State Variable | Type | Description |
|---|---|---|
| `isLive` | Boolean | Whether the session is currently streaming live |
| `isRecording` | Boolean | Whether the session is being recorded |
| `recordingMode` | `'local'` / `'cloud'` | Where the recording is saved |
| `multiTrackEnabled` | Boolean | Whether multi-track recording is active |
| `isMuted` | Boolean | Whether the host's microphone is muted |
| `isCameraOn` | Boolean | Whether the host's camera is on |
| `isScreenSharing` | Boolean | Whether screen sharing is active |

### Virtual Background State

| State Variable | Type | Description |
|---|---|---|
| `virtualBackground` | String/null | Current virtual background selection |
| `customBackgrounds` | Array | User-uploaded custom background images |

### Sidebar State

| State Variable | Type | Default |
|---|---|---|
| `leftSidebarCollapsed` | Boolean | `true` |
| `rightSidebarCollapsed` | Boolean | `true` |

---

## Settings and Options

### Studio Settings (Accessible via Settings Gear)

| Setting | Type | Default | Description |
|---|---|---|---|
| `mirrorVideo` | Boolean | -- | Mirror the local video preview |
| `hdVideo` | Boolean | -- | Enable HD video quality |
| `touchUpAppearance` | Boolean | -- | Enable skin touch-up filter |
| `touchUpLevel` | Number | -- | Touch-up intensity slider |
| `greenScreen` | Boolean | -- | Enable green screen mode |
| `lowLightAdjust` | Boolean | -- | Automatic low-light correction |
| `noiseSuppression` | Boolean | -- | Background noise suppression |
| `autoAdjustMic` | Boolean | -- | Automatic microphone level adjustment |
| `muteOnJoin` | Boolean | -- | Mute microphone when joining |
| `cameraOffOnJoin` | Boolean | -- | Turn off camera when joining |
| `colorMode` | String | -- | Color mode / theme preference |

These settings are covered in detail in [09-studio-media-controls.md](./09-studio-media-controls.md).

---

## Troubleshooting

### Issue: Studio Page Shows Blank/White Screen

| Step | Action |
|---|---|
| 1 | Check browser compatibility (Chrome, Firefox, Edge, Safari recommended) |
| 2 | Check for JavaScript errors in the browser console (F12 > Console) |
| 3 | Verify the URL has valid parameters (`?type=` must be `meeting`, `webinar`, or `livestream`) |
| 4 | Check internet connection |
| 5 | Try clearing browser cache and refreshing |
| 6 | Try incognito mode to rule out browser extensions |

### Issue: Cannot See Sidebars

| Step | Action |
|---|---|
| 1 | Both sidebars start collapsed by default; look for toggle buttons |
| 2 | On mobile (< 768px), sidebars auto-collapse; look for the toggle icon |
| 3 | Try resizing the browser window to > 768px width |
| 4 | Refresh the page if the toggle buttons are not visible |

### Issue: Layout Switcher Not Showing Expected Layouts

| Step | Action |
|---|---|
| 1 | Layouts are filtered by session type; confirm the correct session type is active |
| 2 | Check the `?type=` URL parameter |
| 3 | Meeting mode shows 5 layouts, Webinar shows 6, Live Stream shows 7 |
| 4 | See [07-session-types.md](./07-session-types.md) for the complete layout list per session type |

### Issue: Elements or Overlays Not Appearing on Canvas

| Step | Action |
|---|---|
| 1 | Verify the element was added and is active (check LeftSidebar) |
| 2 | Some elements are session-type-specific (e.g., CTA only in Webinar/Live Stream) |
| 3 | Check if the element is behind another overlay (layer order issue) |
| 4 | In Live Stream mode, check if the element is added to the active scene |

### Issue: BottomControls Buttons Not Responsive

| Step | Action |
|---|---|
| 1 | Check if the browser has granted camera/microphone permissions |
| 2 | Check if another application is using the camera or microphone |
| 3 | Try refreshing the page |
| 4 | Check for browser-specific issues (some controls require HTTPS) |

### Issue: Screen Share Not Working

| Step | Action |
|---|---|
| 1 | Verify the browser supports screen sharing (Chrome, Firefox, Edge) |
| 2 | Ensure the page is served over HTTPS (required for screen sharing API) |
| 3 | Check if the browser prompted for screen share permission and it was denied |
| 4 | On macOS, check System Preferences > Privacy > Screen Recording permissions |
| 5 | Try a different browser if the issue persists |

### Issue: Studio Loads Slowly or Lags

| Step | Action |
|---|---|
| 1 | Check network speed (minimum 5 Mbps recommended for video sessions) |
| 2 | Close unnecessary browser tabs and applications |
| 3 | Disable HD video if network is slow |
| 4 | Disable virtual backgrounds (CPU-intensive) |
| 5 | Reduce the number of visible video tiles if possible |
| 6 | Check `NetworkMonitor` status (Live Stream mode) for detailed diagnostics |

---

## FAQ

**Q: How do I open the chat during a session?**
A: Click the RightSidebar toggle button (usually a chat icon or arrow on the right edge of the screen). The sidebar starts collapsed by default.

**Q: Where do I find the elements library?**
A: Click the LeftSidebar toggle button (usually on the left edge of the screen). The sidebar starts collapsed and contains all available elements.

**Q: Can I rearrange the Studio layout (move sidebars, resize canvas)?**
A: No. The Studio layout is fixed with TopBar at top, LeftSidebar on left, canvas in center, RightSidebar on right, and BottomControls at bottom. You cannot rearrange these regions.

**Q: How do I switch layouts during a live session?**
A: Use the LayoutSwitcherBar, which shows thumbnail previews of available layouts. Click any layout to switch immediately. The change is visible to all participants.

**Q: What is the difference between VideoCanvas and LayoutCanvasEditor?**
A: `VideoCanvas` is used in Meeting and Webinar modes for standard video layout rendering. `LayoutCanvasEditor` is used in Live Stream mode and provides advanced production features like scene editing, drag-and-drop elements, and layer management.

**Q: Can participants see my LeftSidebar or settings?**
A: No. Sidebars and settings panels are visible only to the host/presenter. Participants see only the canvas output (video, overlays, elements on stage).

**Q: How many elements can I add to a session?**
A: There is no hard limit on the number of elements, but performance may degrade with many active elements, especially video and animated overlays. Business plan users have access to all element types; Basic plan users are limited to core media elements.

**Q: Does the Studio work on mobile devices?**
A: The Studio is responsive and works on mobile devices, but the experience is optimized for desktop. Sidebars auto-collapse on screens smaller than 768px, and some advanced features may be harder to access on small screens. A desktop or laptop is recommended for hosting sessions.

---

## Known Limitations

1. **Fixed layout structure**: The five-region Studio layout cannot be customized or rearranged.
2. **Sidebars start collapsed**: Users must manually open sidebars; there is no option to set them as open by default.
3. **Mobile experience is limited**: While responsive, the full Studio feature set is best experienced on desktop.
4. **No multi-monitor support**: The Studio does not support spanning across multiple monitors or detaching panels.
5. **Canvas renderer differs by session type**: The difference between `VideoCanvas` and `LayoutCanvasEditor` can cause confusion when switching between session types.
6. **Element availability varies by plan**: Basic plan users cannot access commerce, gamification, or advanced interactive elements.
7. **No offline mode**: The Studio requires an active internet connection at all times.
8. **Browser extension conflicts**: Some browser extensions (ad blockers, privacy tools) can interfere with Studio functionality.

---

## Plan Requirements

| Feature | Basic | Business |
|---|---|---|
| Studio access | Yes | Yes |
| Meeting mode Studio | Yes | Yes |
| Webinar mode Studio | No | Yes |
| Live Stream mode Studio | No | Yes |
| Core media elements (Slides, Video, Audio) | Yes | Yes |
| All interactive elements | No | Yes |
| Commerce elements | No | Yes |
| Gamification elements | No | Yes |
| Breakout rooms | 1 room | Unlimited |
| Multi-track recording | No | Yes |
| Live streaming (RTMP) | No | Yes |
| AI Chat Insights | No | Yes |
| Live Transcription | No | Yes |
| Live Captions/Translation | No | Yes |

---

## Related Documents

- [07-session-types.md](./07-session-types.md) -- Session type details and layout specifications
- [09-studio-media-controls.md](./09-studio-media-controls.md) -- Detailed media control settings
- [06-rooms-management.md](./06-rooms-management.md) -- Room setup before launching Studio
- [05-authentication-and-access.md](./05-authentication-and-access.md) -- Access requirements for Studio
- [01-platform-overview.md](./01-platform-overview.md) -- Platform architecture overview
- [02-plans-and-pricing.md](./02-plans-and-pricing.md) -- Plan-based feature availability
