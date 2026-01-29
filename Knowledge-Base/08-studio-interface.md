# 08 - Studio Interface

## Overview

The Studio is R-Link's live session environment where hosts and participants interact during meetings, webinars, and live streams. It is a web-based application built on a 5-region layout architecture: TopBar, LeftSidebar, VideoCanvas (center), RightSidebar, and BottomControls. The Studio is launched from a room URL and configured via URL parameters.

The Studio interface is context-aware -- it adapts based on the session type (Meeting, Webinar, Live Stream), the user's role (host, presenter, participant), and the current layout selection. A `LayoutProvider` and `LayoutContext` manage the state of layout regions, selected layouts, and canvas rendering.

---

## Studio Launch

### Entry Points

Users reach the Studio through:

1. **Room launch button:** Clicking "Launch" / "Go Live" / "Start" in the Rooms tab
2. **Direct URL:** Navigating to `/Studio?room={slug}`
3. **Room vanity URL:** Visiting `https://rally.r-link.com/{slug}` as a participant (after entry flow)

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `room` | string | No | Room slug to load room configuration. If omitted, a temporary session is created. |
| `type` | string | No | Session type: `'meeting'`, `'webinar'`, or `'livestream'`. Overrides room default. Falls back to `'meeting'` if neither specified. |
| `name` | string | No | Pre-fills the participant's display name on the setup page. |

**Example URLs:**
```
/Studio
/Studio?type=meeting
/Studio?room=weekly-standup
/Studio?room=product-demo&type=webinar
/Studio?room=live-show&type=livestream&name=John
```

### Launch Sequence

```
1. User navigates to Studio URL
   |
   v
2. Setup Page loads (see Setup Page section)
   |
   v
3. User configures camera/mic, enters name
   |
   v
4. User clicks "Join" / "Start Session"
   |
   v
5. Studio interface loads with 5-region layout
   |
   v
6. LayoutProvider initializes with session type defaults
   |
   v
7. Session is active
```

---

## 5-Region Layout Architecture

The Studio interface is divided into 5 distinct regions arranged in a fixed structure:

### Layout Diagram

```
+------------------------------------------------------------------+
|                          TOP BAR                                  |
|  [Logo] [Session Name] [Timer]              [Settings] [Leave]   |
+----------+---------------------------------------+---------------+
|          |                                       |               |
|  LEFT    |                                       |   RIGHT       |
|  SIDE    |          VIDEO CANVAS                 |   SIDE        |
|  BAR     |    (LayoutCanvasEditor /              |   BAR         |
|          |     VideoCanvas)                      |               |
| Elements |                                       |  Chat / Q&A   |
| Panel    |                                       |  Participants |
|          |                                       |               |
|          |                                       |               |
+----------+---------------------------------------+---------------+
|                      BOTTOM CONTROLS                             |
|  [Mic] [Camera] [Screen] [Record] [Layout] [Effects] [More]     |
+------------------------------------------------------------------+
```

### Region Specifications

#### 1. TopBar

| Attribute | Detail |
|-----------|--------|
| Position | Fixed at top, full width |
| Height | ~48-56px |
| Z-index | Highest (always on top) |
| Background | Dark (follows colorMode) |

**Components:**

| Component | Position | Description |
|-----------|----------|-------------|
| Logo | Left | R-Link logo or workspace logo (from brand kit) |
| Session name | Left-center | Displays the room name or custom session name |
| Session timer | Center | Elapsed time since session started (HH:MM:SS format) |
| Participant count | Right-center | Number of active participants |
| Recording indicator | Right-center | Red dot + "REC" when recording is active |
| Settings gear | Right | Opens studio settings panel |
| Leave button | Far right | "Leave" / "End Session" button (red) |

**TopBar behavior:**
- Always visible; does not collapse or hide
- Session name is truncated with ellipsis if too long
- Timer starts from 00:00:00 when the session begins
- Leave button shows "End for All" option for hosts, "Leave" for participants

#### 2. LeftSidebar (Elements Panel)

| Attribute | Detail |
|-----------|--------|
| Position | Left side, below TopBar, above BottomControls |
| Width | ~280px (expanded), 0px (collapsed) |
| Default state | **Collapsed** |
| Toggle | Button in BottomControls or TopBar |
| Overflow | Scrollable vertically |

**Components by Session Type:**

| Component | Meeting | Webinar | Live Stream | Description |
|-----------|---------|---------|-------------|-------------|
| Layout selector | Yes | Yes | Yes | Grid of available layouts for the current session type |
| Brand elements | Yes | Yes | Yes | Logo, lower thirds, name tags |
| Backgrounds | Yes | Yes | Yes | Virtual backgrounds and scene backgrounds |
| CTA editor | No | Yes | Yes | Create/edit call-to-action overlays |
| Talking points editor | No | Yes | Yes | Create/edit talking point prompts |
| Scene manager | No | No | Yes | Create/manage scenes (camera, media, transitions) |
| Media library | No | No | Yes | Upload and manage media files for scenes |
| Comments config | No | No | Yes | Configure comments overlay appearance |
| Template selector | Yes | Yes | Yes | Quick-select a layout template |
| Brand kit selector | Yes | Yes | Yes | Quick-select a brand kit |

**LeftSidebar behavior:**
- Starts collapsed on initial load
- Opens when user clicks the elements/layout toggle in BottomControls
- Pushes the VideoCanvas to the right (does not overlay)
- At viewport widths < 768px, opens as an overlay panel instead of pushing content
- Can be closed by clicking the X button in the sidebar header or clicking outside (on mobile)

#### 3. VideoCanvas / LayoutCanvasEditor (Center)

| Attribute | Detail |
|-----------|--------|
| Position | Center, fills remaining space between sidebars |
| Sizing | Flexible, adapts to available space |
| Aspect ratio | 16:9 preferred, maintained with letterboxing if needed |
| Rendering | HTML5 Canvas + WebRTC video elements |

**Two Rendering Modes:**

| Mode | Component | Description |
|------|-----------|-------------|
| Viewer mode | `VideoCanvas` | Read-only rendering of the session layout. Used for participants who are not hosts. Displays the selected layout with video feeds in their assigned regions. |
| Editor mode | `LayoutCanvasEditor` | Interactive canvas for hosts. Allows layout selection, element placement, drag-and-drop of overlays, and live preview of layout changes. Used when the user has host/presenter privileges. |

**VideoCanvas responsibilities:**
- Renders video feeds from WebRTC connections
- Applies the selected layout's region configuration
- Displays overlay elements (CTAs, talking points, comments, lower thirds)
- Handles screen share rendering
- Maintains aspect ratio with responsive sizing

**LayoutCanvasEditor additional capabilities:**
- Drag-and-drop element positioning
- Live layout switching preview
- Element resize handles
- Layer ordering (bring to front, send to back)
- Grid snapping for precise element placement
- Undo/redo for layout changes

**Canvas behavior:**
- Automatically resizes when sidebars open/close
- Maintains 16:9 aspect ratio within available space
- Adds letterboxing (black bars) if the container aspect ratio doesn't match
- Video feeds are rendered at the highest quality supported by the connection

#### 4. RightSidebar (Communication Panel)

| Attribute | Detail |
|-----------|--------|
| Position | Right side, below TopBar, above BottomControls |
| Width | ~320px (expanded), 0px (collapsed) |
| Default state | **Collapsed** |
| Toggle | Button in BottomControls |
| Overflow | Scrollable vertically (per tab) |

**Tabs by Session Type:**

| Tab | Meeting | Webinar | Live Stream | Description |
|-----|---------|---------|-------------|-------------|
| Chat | Yes | Yes | Yes | Text chat for all participants. Messages persist for session duration. |
| Q&A | No | Yes | No | Question and answer panel. Audience submits questions; host can answer, dismiss, or highlight. |
| Participants | Yes | Yes | Yes | List of all participants with role badges, mute status, and host controls (mute, remove, promote). |
| Comments | No | No | Yes | Live stream comments feed from connected platforms. |

**RightSidebar behavior:**
- Starts collapsed on initial load
- Opens when user clicks Chat, Q&A, or Participants button in BottomControls
- Pushes the VideoCanvas to the left (does not overlay)
- Only one tab is active at a time (tabs switch within the sidebar)
- Unread message indicator (badge/dot) appears on toggle buttons when new messages arrive while collapsed
- At viewport widths < 768px, opens as an overlay panel

#### 5. BottomControls

| Attribute | Detail |
|-----------|--------|
| Position | Fixed at bottom, full width |
| Height | ~64-72px |
| Z-index | High (above canvas, below modals) |
| Background | Dark (follows colorMode) |

**Controls (left to right):**

| Control | Icon | Description | Keyboard shortcut |
|---------|------|-------------|-------------------|
| Microphone toggle | Mic / Mic-off | Mute/unmute microphone | `M` or `Alt+A` |
| Camera toggle | Camera / Camera-off | Enable/disable camera | `V` or `Alt+V` |
| Screen share | Monitor | Start/stop screen sharing | - |
| Record | Circle (red when active) | Start/stop recording | - |
| Layout/Elements | Grid | Toggle LeftSidebar | - |
| Effects | Sparkle | Open effects panel (filters, backgrounds, touch-up) | - |
| Chat | Message bubble | Toggle RightSidebar (Chat tab) | - |
| Q&A | Question mark | Toggle RightSidebar (Q&A tab) (Webinar only) | - |
| Participants | People | Toggle RightSidebar (Participants tab) | - |
| More | Three dots | Additional options menu | - |
| Reactions | Emoji | Send emoji reactions (floating on canvas) | - |

**BottomControls behavior:**
- Always visible; does not collapse or hide
- Active states shown with color highlight (e.g., mic muted shows red, recording shows red pulse)
- Controls that are not available for the current session type are hidden (e.g., Q&A hidden in Meeting mode)
- Tooltips shown on hover with control name and keyboard shortcut

---

## LayoutProvider and LayoutContext

### LayoutProvider

The `LayoutProvider` is a React context provider that wraps the Studio's main content area. It manages:

| State | Type | Description |
|-------|------|-------------|
| `currentLayout` | string | The currently selected layout key (e.g., `'gallery'`, `'stage_host'`) |
| `sessionType` | string | The active session type (`'meeting'`, `'webinar'`, `'livestream'`) |
| `availableLayouts` | array | List of layouts available for the current session type |
| `layoutConfig` | object | The current layout's configuration (regions, features, properties) |
| `elements` | array | Overlay elements placed on the canvas (CTAs, lower thirds, etc.) |
| `activeScene` | string | (Live Stream only) The currently active scene |
| `scenes` | array | (Live Stream only) List of available scenes |

### LayoutContext

Consumed by Studio components to read and update layout state:

```javascript
const {
  currentLayout,
  setCurrentLayout,
  sessionType,
  availableLayouts,
  layoutConfig,
  elements,
  addElement,
  removeElement,
  updateElement,
  activeScene,
  switchScene,
} = useContext(LayoutContext);
```

### Layout Selection Flow

```
User clicks layout in LeftSidebar
    |
    v
setCurrentLayout(newLayoutKey) called
    |
    v
LayoutProvider updates layoutConfig with new region configuration
    |
    v
VideoCanvas / LayoutCanvasEditor re-renders with new region sizes
    |
    v
Video feeds rearrange to fit new regions
    |
    v
Overlay elements reposition according to new layout's supported features
```

---

## Sidebar Behavior

### Default State

| Sidebar | Default | Reason |
|---------|---------|--------|
| LeftSidebar | Collapsed | Maximizes canvas space for video content |
| RightSidebar | Collapsed | Maximizes canvas space for video content |

### Toggle Mechanism

- Clicking a toggle button opens the sidebar if it is closed
- Clicking the same toggle button closes the sidebar if it is open
- Clicking a different tab's toggle button in the RightSidebar switches tabs without closing
- Both sidebars can be open simultaneously (canvas shrinks to accommodate)

### Canvas Resizing

When sidebars open/close, the VideoCanvas smoothly resizes:

```
Both collapsed:   [=== FULL WIDTH CANVAS ===]
Left open:        [LEFT][==== CANVAS ====]
Right open:       [==== CANVAS ====][RIGHT]
Both open:        [LEFT][== CANVAS ==][RIGHT]
```

The canvas maintains its 16:9 aspect ratio at all sizes, adding letterboxing as needed.

---

## Mobile Responsive Behavior

### Breakpoint: 768px

At viewport widths below 768px, the Studio switches to a mobile-optimized layout:

| Change | Desktop (>=768px) | Mobile (<768px) |
|--------|-------------------|-----------------|
| Sidebars | Push content | Overlay as panels |
| Left sidebar | 280px push | Full-width overlay |
| Right sidebar | 320px push | Full-width overlay |
| Auto-collapse | No | Yes - sidebars auto-collapse when another opens |
| Canvas | Resizes with sidebars | Always full-width |
| BottomControls | All controls visible | Some controls in "More" menu |
| TopBar | Full content | Condensed (shorter labels) |

### Auto-Collapse on Mobile

On mobile viewports:
1. Only one sidebar can be open at a time
2. Opening the LeftSidebar automatically closes the RightSidebar (and vice versa)
3. Sidebars open as full-screen overlays on top of the canvas
4. A semi-transparent backdrop allows tapping outside to close
5. Swipe gestures may be used to dismiss sidebars

### Mobile-Specific Controls

| Feature | Behavior on Mobile |
|---------|-------------------|
| Layout selection | Simplified grid in bottom sheet |
| Effects panel | Bottom sheet overlay |
| Chat | Full-screen overlay |
| Participants list | Full-screen overlay |
| Recording controls | Moved to "More" menu |
| Screen share | May be unavailable on mobile browsers |

---

## Setup Page

### Overview

The Setup Page is the pre-session screen where users configure their camera, microphone, and display name before joining a session. It appears after navigating to a Studio URL (after any room access gates like password, registration, or recording consent).

### Setup Page Layout

```
+------------------------------------------+
|                                          |
|  [Session Type Label: "Join Meeting"]    |
|  [Event/Room Name]                       |
|                                          |
|  +----------------------------------+   |
|  |                                  |   |
|  |    Camera Preview                |   |
|  |    (16:9 video preview)          |   |
|  |                                  |   |
|  +----------------------------------+   |
|                                          |
|  Camera: [Dropdown: Select camera   v]   |
|  Mic:    [Dropdown: Select mic      v]   |
|  Speaker:[Dropdown: Select speaker  v]   |
|                                          |
|  [Audio Level Meter: ||||||||    ]       |
|                                          |
|  Display Name: [Text Input         ]    |
|  Event Name:   [Text Input         ]    |
|                                          |
|  Camera: [Granted]  Mic: [Granted]       |
|                                          |
|  [        Join Session        ]          |
|                                          |
+------------------------------------------+
```

### Setup Page Components

#### Camera Preview

| Attribute | Detail |
|-----------|--------|
| Size | Responsive, maintains 16:9 aspect ratio |
| Content | Live camera feed from selected camera device |
| Fallback | Camera-off icon with user's initials when camera is off or permission denied |
| Mirror | Video is mirrored (horizontally flipped) by default for self-view |
| Controls | Small toggle buttons overlaid for camera on/off and mic on/off |

#### Device Selection Dropdowns

| Dropdown | Source | Behavior |
|----------|--------|----------|
| Camera | `navigator.mediaDevices.enumerateDevices()` filtered by `kind: 'videoinput'` | Lists all available cameras. Selecting a different camera immediately switches the preview. |
| Microphone | `navigator.mediaDevices.enumerateDevices()` filtered by `kind: 'audioinput'` | Lists all available microphones. Selecting a different mic immediately switches the audio input. |
| Speaker | `navigator.mediaDevices.enumerateDevices()` filtered by `kind: 'audiooutput'` | Lists all available speakers/headphones. Includes a "Test" button to play a test tone. Not available on all browsers (depends on `setSinkId` support). |

**Note:** Device enumeration requires camera/mic permissions to return device labels. Before permissions are granted, devices may appear as "Camera 1", "Camera 2" without model names.

#### Audio Level Meter

| Attribute | Detail |
|-----------|--------|
| Type | Visual bar meter with frequency visualization |
| Source | Selected microphone audio stream |
| Update rate | ~60fps (requestAnimationFrame) |
| Visual | Horizontal bar that bounces with audio input; may include frequency spectrum visualization |
| Purpose | Confirms the selected microphone is working and picking up audio |
| Behavior | Shows real-time audio level; bar moves when the user speaks; stays flat when silent |

The audio level meter uses the Web Audio API to analyze the microphone input:
1. Creates an `AudioContext`
2. Creates a `MediaStreamSource` from the mic stream
3. Connects an `AnalyserNode` for frequency data
4. Renders the frequency data as a visual bar/spectrum

#### Display Name Input

| Attribute | Detail |
|-----------|--------|
| Type | Text input |
| Pre-fill | From `?name=` URL parameter, or from user's account name if authenticated |
| Validation | Required; minimum 1 character |
| Max length | 50 characters |
| Purpose | Sets the name shown to other participants in the session |

#### Event Name Input

| Attribute | Detail |
|-----------|--------|
| Type | Text input |
| Pre-fill | From the room name if a room is specified |
| Validation | Optional |
| Purpose | Custom label for the session (shown in TopBar and recordings) |

#### Permission Status Indicators

Each media permission has a status indicator:

| Status | Icon/Badge | Color | Meaning |
|--------|-----------|-------|---------|
| `pending` | Clock / loading | Yellow/amber | Permission has not been requested yet or request is in progress |
| `granted` | Checkmark | Green | Permission granted; device is accessible |
| `denied` | X / blocked | Red | Permission denied; device cannot be accessed |

**Permission check flow:**
```
Page loads
    |
    v
Check navigator.permissions.query({ name: 'camera' })
Check navigator.permissions.query({ name: 'microphone' })
    |
    +-- 'granted' → Show green indicator, initialize device
    |
    +-- 'prompt' → Show yellow indicator, request permission via getUserMedia()
    |       |
    |       +-- User allows → Show green, initialize device
    |       +-- User denies → Show red, show guidance message
    |
    +-- 'denied' → Show red indicator, show guidance to enable in browser settings
```

**Guidance message for denied permissions:**
"Camera/Microphone access is blocked. To enable it, click the camera/lock icon in your browser's address bar and allow access, then refresh the page."

#### Session Type Label

Displayed at the top of the setup page based on the `sessionLabels` mapping:

| Session Type | Label Displayed |
|--------------|----------------|
| `meeting` | "Join Meeting" or "Start Meeting" (host) |
| `webinar` | "Join Webinar" or "Start Webinar" (host) |
| `livestream` | "Join Live Stream" or "Start Live Stream" (host) |

The session type is determined from the `?type=` URL parameter. If not specified, the room's default session type is used, falling back to `meeting`.

#### Join Button

| Attribute | Detail |
|-----------|--------|
| Label | "Join Session" / "Start Session" (for hosts) |
| Enabled when | Display name is filled; at least one of camera or mic permission is granted (or explicitly skipped) |
| Disabled when | Display name is empty; permissions are still being requested |
| Action | Closes setup page, enters the studio session, connects to the WebRTC session |

---

## Studio Settings Panel

Accessed via the gear icon in the TopBar, the settings panel is a modal/slide-out that includes:

| Setting Category | Settings |
|-----------------|----------|
| Audio | Microphone selection, noise suppression, auto-adjust mic, mute on join |
| Video | Camera selection, HD video, mirror video, camera off on join |
| Appearance | Touch-up appearance, virtual background, green screen |
| General | Color mode (dark/light), display name change, language |
| Recording | Recording quality, auto-record on start |
| Advanced | Low-light adjustment, hardware acceleration |

See [09 - Studio Media Controls](./09-studio-media-controls.md) for full details on all settings.

---

## Component Hierarchy

### Top-Level Structure

```
<StudioPage>
  <LayoutProvider sessionType={type} room={room}>
    <TopBar />
    <StudioBody>
      <LeftSidebar />
      <CanvasContainer>
        {isHost ? <LayoutCanvasEditor /> : <VideoCanvas />}
      </CanvasContainer>
      <RightSidebar />
    </StudioBody>
    <BottomControls />
  </LayoutProvider>
</StudioPage>
```

### Key Component Relationships

| Parent | Child | Purpose |
|--------|-------|---------|
| `StudioPage` | `LayoutProvider` | Wraps all studio content with layout state |
| `LayoutProvider` | `TopBar` | Access to session info, timer, leave |
| `LayoutProvider` | `LeftSidebar` | Layout selection, element editing |
| `LayoutProvider` | `CanvasContainer` | Holds the canvas component |
| `CanvasContainer` | `LayoutCanvasEditor` | Interactive canvas for hosts |
| `CanvasContainer` | `VideoCanvas` | View-only canvas for participants |
| `LayoutProvider` | `RightSidebar` | Chat, Q&A, participants |
| `LayoutProvider` | `BottomControls` | Media controls, sidebar toggles |

---

## Troubleshooting Guide

### Symptom: Studio shows blank/white screen after joining

**Diagnostic steps:**
1. Check browser console for JavaScript errors
2. Verify WebRTC is supported in the browser
3. Check if any browser extensions are blocking WebRTC
4. Verify internet connection stability

**Common fixes:**
- Try a different browser (Chrome recommended)
- Disable browser extensions, especially VPN/privacy extensions
- Clear browser cache and refresh
- Check if the workspace/room still exists

### Symptom: Sidebars won't open

**Diagnostic steps:**
1. Check if the viewport width is very narrow (sidebars may be overlaying)
2. Verify JavaScript is running (no console errors)
3. Check if the toggle buttons are present in BottomControls

**Common fixes:**
- Increase browser window width
- On mobile, look for overlay-style sidebars
- Refresh the page
- Try a different browser

### Symptom: Video canvas is very small even with both sidebars closed

**Diagnostic steps:**
1. Check browser zoom level (should be 100%)
2. Check if the window is very small
3. Verify no CSS override from extensions

**Common fixes:**
- Reset browser zoom to 100% (Ctrl+0)
- Maximize the browser window
- Check for browser extension conflicts

### Symptom: Camera preview not showing on setup page

**Diagnostic steps:**
1. Check permission status indicator (should be green "Granted")
2. If "Denied", check browser permission settings
3. If "Pending", a permission prompt may be hidden behind another window
4. Verify camera is not in use by another application

**Common fixes:**
- Click the lock/camera icon in the browser address bar and allow camera
- Close other applications using the camera (Zoom, Teams, etc.)
- Try a different camera from the dropdown
- Restart the browser

### Symptom: Audio level meter shows no activity when speaking

**Diagnostic steps:**
1. Check that the correct microphone is selected in the dropdown
2. Check the permission status indicator for microphone
3. Try speaking louder or tapping the microphone
4. Check system-level audio settings

**Common fixes:**
- Select a different microphone from the dropdown
- Check operating system microphone settings (ensure the correct mic is set as default)
- Grant microphone permission if blocked
- Test the microphone in another application to confirm it works

### Symptom: Layout not changing when selected

**Diagnostic steps:**
1. Verify the user is the host (only hosts can change layouts via LayoutCanvasEditor)
2. Check that the layout belongs to the current session type
3. Look for errors in the browser console

**Common fixes:**
- Ensure the correct session type is active
- Refresh the page if layout state is stuck
- Verify host privileges

### Symptom: Mobile layout feels unusable / too cramped

**Diagnostic steps:**
1. Confirm the viewport is triggering mobile mode (<768px)
2. Check that sidebars are using overlay mode
3. Verify the canvas is using full width

**Common fixes:**
- Use landscape orientation for more canvas space
- Keep sidebars closed when not actively needed
- Use the desktop version on a laptop/tablet for a better experience

---

## Frequently Asked Questions

### Q: Can I resize the sidebars?
**A:** No. Sidebar widths are fixed (LeftSidebar: ~280px, RightSidebar: ~320px). They can only be opened (full width) or closed (0px). The canvas resizes to fill the remaining space.

### Q: Can I rearrange the 5 regions (e.g., move chat to the left)?
**A:** No. The 5-region layout is fixed: TopBar (top), LeftSidebar (left), Canvas (center), RightSidebar (right), BottomControls (bottom). Regions cannot be repositioned.

### Q: What is the difference between VideoCanvas and LayoutCanvasEditor?
**A:** `VideoCanvas` is the read-only renderer used by participants. It displays the session layout as-is. `LayoutCanvasEditor` is the interactive version used by hosts, which adds drag-and-drop element positioning, layout switching, and visual editing tools. The appropriate component is rendered based on the user's role.

### Q: Can multiple hosts edit the layout simultaneously?
**A:** Layout changes made by any host are synchronized to all participants in real-time. However, simultaneous edits by multiple hosts may cause conflicts. The last change wins. It is recommended that one host controls the layout at a time.

### Q: Does the studio work on mobile browsers?
**A:** Yes, with limitations. The studio is responsive down to 768px and below, with overlay-style sidebars and condensed controls. However, some features (screen sharing, certain effects) may not be available on mobile browsers. For the best experience, use a desktop browser.

### Q: Can I use the studio without a camera or microphone?
**A:** Yes. You can join with camera and microphone off. The setup page allows you to proceed without granting device permissions, though you will see the "denied" status indicators. You will appear as an avatar/initials tile to other participants.

### Q: How do I know which session type is active?
**A:** The session type is indicated in the setup page header (e.g., "Join Meeting") and in the TopBar during the session. The available layouts in the LeftSidebar also indicate the session type (meeting layouts, webinar layouts, or live stream layouts).

### Q: Can I open both sidebars on mobile?
**A:** No. On viewports below 768px, only one sidebar can be open at a time. Opening one automatically closes the other. Sidebars appear as full-screen overlays on mobile.

---

## Known Limitations

1. **Fixed region positions:** The 5-region layout cannot be customized. Regions always appear in the same positions (top, left, center, right, bottom).

2. **Fixed sidebar widths:** Sidebars cannot be resized by dragging. They have preset widths and can only be toggled open or closed.

3. **No multi-monitor support:** The studio is designed for a single browser window. It does not support popping out panels or sidebars into separate windows.

4. **No picture-in-picture for the entire studio:** While individual video elements may support browser PiP, the entire studio interface cannot be minimized to a PiP window.

5. **Mobile screen sharing limitations:** Screen sharing may not be available on iOS Safari and some Android browsers due to browser API limitations.

6. **No offline mode:** The studio requires a continuous internet connection. There is no offline fallback or local recording mode.

7. **Canvas aspect ratio is fixed at 16:9:** The canvas always renders in 16:9. There is no option for 4:3, 1:1, or vertical (9:16) aspect ratios, even for mobile-optimized streams.

8. **Single layout active at a time:** Only one layout can be active across the session. You cannot have different layouts for different participants (e.g., host sees gallery while audience sees stage_host).

9. **Setup page is mandatory:** There is no way to skip the setup page and join directly. Users must always pass through the setup flow.

---

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Studio access | Yes | Yes |
| Setup page | Yes | Yes |
| All 5 regions | Yes | Yes |
| LeftSidebar elements | Basic (layouts, backgrounds) | Full (all elements, scenes, media) |
| RightSidebar Chat | Yes | Yes |
| RightSidebar Q&A | Yes (Webinar only) | Yes (Webinar only) |
| RightSidebar Participants | Yes | Yes |
| LayoutCanvasEditor (host) | Yes | Yes |
| VideoCanvas (participant) | Yes | Yes |
| Recording | No | Yes |
| Screen sharing | Yes | Yes |
| Custom brand elements | No | Yes |
| Scene manager (Live Stream) | No | Yes |
| Media library (Live Stream) | No | Yes |

---

## Related Documents

- [05 - Authentication and Access](./05-authentication-and-access.md) - Authentication state affects studio access and host/participant rendering
- [06 - Rooms Management](./06-rooms-management.md) - Rooms are launched into the Studio; room settings affect the entry flow
- [07 - Session Types](./07-session-types.md) - Session type determines available layouts, features, and sidebar content
- [09 - Studio Media Controls](./09-studio-media-controls.md) - Detailed reference for all camera, microphone, and effects settings available in the Studio
