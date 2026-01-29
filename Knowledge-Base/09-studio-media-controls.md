# 09 - Studio Media Controls

## Overview

R-Link's Studio provides comprehensive media controls for camera, microphone, screen sharing, and visual enhancement. These controls are accessible through the BottomControls bar, the Settings panel (gear icon in TopBar), and the Effects panel. The platform includes advanced features like skin enhancement processing, virtual backgrounds, touch-up controls, and professional-grade audio settings.

Media settings are per-user and per-session. Each participant controls their own camera, microphone, and effects independently. Settings are persisted in localStorage so they carry over between sessions.

---

## Core Media State

The Studio maintains three primary media state flags:

### Primary State Flags

| State | Type | Default | Description |
|-------|------|---------|-------------|
| `isMuted` | `boolean` | `false` (unless `muteOnJoin` is enabled) | Whether the user's microphone is muted. When `true`, no audio is transmitted to other participants. |
| `isCameraOn` | `boolean` | `true` (unless `cameraOffOnJoin` is enabled) | Whether the user's camera is active. When `false`, other participants see an avatar/initials tile instead of video. |
| `isScreenSharing` | `boolean` | `false` | Whether the user is currently sharing their screen. When `true`, the screen share feed replaces or supplements the camera feed in the layout. |

### State Interactions

```
Microphone:
  isMuted = false → Audio transmitted, mic icon shows active state
  isMuted = true  → Audio NOT transmitted, mic icon shows muted (red/strikethrough)

Camera:
  isCameraOn = true  → Video transmitted, camera feed visible to others
  isCameraOn = false → Video NOT transmitted, avatar/initials shown

Screen Share:
  isScreenSharing = false → Normal camera-only mode
  isScreenSharing = true  → Screen feed added to session; layout may auto-switch
                             to accommodate screen share (e.g., screen_thumbnails)
```

### Toggle Behavior

| Action | Trigger | Effect |
|--------|---------|--------|
| Toggle mic | Click mic button / press `M` / press `Alt+A` | Flips `isMuted` between `true` and `false` |
| Toggle camera | Click camera button / press `V` / press `Alt+V` | Flips `isCameraOn` between `true` and `false` |
| Start screen share | Click screen share button | Opens browser screen picker dialog; on selection, sets `isScreenSharing = true` |
| Stop screen share | Click screen share button again / click "Stop Sharing" | Sets `isScreenSharing = false`, returns to camera-only mode |

---

## General Media Settings

These settings are available in the Studio Settings panel and affect fundamental behavior:

### `mirrorVideo`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `true` |
| Description | Mirrors (horizontally flips) the user's own camera preview. This only affects the self-view; other participants see the non-mirrored feed. |
| Location | Settings > Video |
| Behavior ON | Self-view is horizontally flipped (natural mirror effect, like looking in a mirror) |
| Behavior OFF | Self-view shows the actual camera output (non-flipped) |
| Note | Text and screen elements will appear reversed in self-view when mirrored. This does NOT affect what others see. |

### `hdVideo`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `false` |
| Description | Enables high-definition video capture (720p or 1080p depending on camera capability and bandwidth). |
| Location | Settings > Video |
| Behavior ON | Camera captures at highest available resolution (up to 1080p). Uses more bandwidth and CPU. |
| Behavior OFF | Camera captures at standard definition (480p or 360p) for lower bandwidth usage. |
| Impact | Higher CPU usage, higher bandwidth consumption, better visual quality. May cause frame drops on lower-end devices. |

### `muteOnJoin`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `false` |
| Description | Automatically mutes the microphone when joining a session. User must manually unmute after joining. |
| Location | Settings > Audio |
| Behavior ON | `isMuted` is set to `true` immediately upon joining the session. Mic icon shows muted state. |
| Behavior OFF | Microphone starts active (unmuted) when joining. |
| Use case | Large meetings, webinars, environments where background noise should be avoided at join time. |

### `cameraOffOnJoin`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `false` |
| Description | Automatically turns off the camera when joining a session. User must manually enable camera after joining. |
| Location | Settings > Video |
| Behavior ON | `isCameraOn` is set to `false` immediately upon joining. Avatar/initials shown instead of video. |
| Behavior OFF | Camera starts active (on) when joining. |
| Use case | Conserving bandwidth, privacy preference, joining while not camera-ready. |

### `colorMode`

| Attribute | Detail |
|-----------|--------|
| Type | `string` |
| Default | `'dark'` |
| Options | `'dark'`, `'light'` |
| Description | Controls the overall color scheme of the Studio interface (not the video feed). |
| Location | Settings > General |
| Dark mode | Dark backgrounds, light text. Reduces eye strain. Default and recommended for most users. |
| Light mode | Light backgrounds, dark text. May be preferred in bright environments. |
| Scope | Affects TopBar, sidebars, BottomControls, settings panels, modals. Does NOT affect the video canvas content. |

---

## Audio Settings

### `noiseSuppression`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `true` |
| Description | Enables AI-powered noise suppression that filters out background noise (keyboard clicks, fans, construction, traffic, etc.) while preserving speech. |
| Location | Settings > Audio |
| Behavior ON | Background noise is actively suppressed. Speech is clear and isolated. |
| Behavior OFF | Raw microphone audio is transmitted with no noise filtering. |
| Technology | Uses Web Audio API or a dedicated noise suppression library/processor. |
| Impact | Slight increase in CPU usage. Very slight latency addition (<20ms). |
| Recommendation | Keep ON for most environments. Turn OFF only for music/audio production use cases where full-fidelity audio is required. |

### `autoAdjustMic`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `true` |
| Description | Automatically adjusts microphone input level (gain) to maintain consistent audio volume. Prevents audio from being too quiet or too loud. |
| Location | Settings > Audio |
| Behavior ON | System monitors audio levels and dynamically adjusts gain. Quiet speakers are boosted; loud speakers are attenuated. |
| Behavior OFF | Microphone input level is fixed at the system level. User must manually adjust mic volume in OS settings. |
| Impact | Smooth, consistent audio for all participants. May introduce slight pumping effect in some scenarios. |

---

## Touch-Up and Appearance Settings

### `touchUpAppearance`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `false` |
| Description | Master toggle for appearance touch-up features. When enabled, activates the skin enhancement pipeline with the configured `touchUpLevel`. |
| Location | Settings > Appearance / Effects Panel |
| Behavior ON | Skin smoothing, blemish reduction, and other enhancements are applied to the video feed in real-time. |
| Behavior OFF | No touch-up processing is applied. Raw camera feed is used. |
| Dependency | Requires `SkinEnhancementProcessor` to be initialized. See SkinEnhancementProcessor section. |

### `touchUpLevel`

| Attribute | Detail |
|-----------|--------|
| Type | `number` (0-100) |
| Default | `50` |
| Description | Controls the intensity of the touch-up effect. Higher values produce more smoothing and enhancement. |
| Location | Settings > Appearance / Effects Panel (slider) |
| Range | 0 = minimal touch-up, 100 = maximum touch-up |
| Interaction | Only active when `touchUpAppearance` is `true`. |
| UI element | Horizontal slider with numeric label showing current value. |

### `greenScreen`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `false` |
| Description | Enables chroma key (green screen) background replacement. When enabled, a green (or blue) background behind the user is replaced with the selected virtual background. |
| Location | Settings > Appearance / Effects Panel |
| Behavior ON | Chroma key processing is activated. A physical green/blue screen behind the user is detected and replaced. |
| Behavior OFF | Green screen detection is disabled. Virtual backgrounds (if enabled) use AI-based segmentation instead. |
| Requirements | Physical green or blue screen/backdrop behind the user for best results. Uniform lighting on the backdrop. |
| Note | Green screen mode provides cleaner background replacement than AI segmentation but requires a physical backdrop. |

---

## Skin Enhancement Settings (Advanced)

These settings provide granular control over facial enhancement processing. They are sub-settings of the touch-up system and require `touchUpAppearance` to be enabled.

### `skinToneEven`

| Attribute | Detail |
|-----------|--------|
| Type | `number` (0-100) or `boolean` |
| Default | `0` / `false` |
| Description | Evens out skin tone variations across the face, reducing redness, blotchiness, and uneven pigmentation. |
| Location | Effects Panel > Skin Enhancement |
| Effect | Higher values produce more even skin tone. Low values preserve natural skin tone variation. |

### `blemishReduction`

| Attribute | Detail |
|-----------|--------|
| Type | `number` (0-100) or `boolean` |
| Default | `0` / `false` |
| Description | Reduces the visibility of skin blemishes, spots, and minor imperfections. |
| Location | Effects Panel > Skin Enhancement |
| Effect | Higher values more aggressively smooth blemishes. May also soften fine details at very high values. |

### `eyeBrightness`

| Attribute | Detail |
|-----------|--------|
| Type | `number` (0-100) or `boolean` |
| Default | `0` / `false` |
| Description | Increases the brightness and whiteness of the eye area (sclera), making eyes appear more vibrant and awake. |
| Location | Effects Panel > Skin Enhancement |
| Effect | Subtle brightening of the eye whites. Higher values produce more noticeable brightening. |

### `teethWhitening`

| Attribute | Detail |
|-----------|--------|
| Type | `number` (0-100) or `boolean` |
| Default | `0` / `false` |
| Description | Whitens the appearance of teeth when the user smiles or speaks. |
| Location | Effects Panel > Skin Enhancement |
| Effect | Subtle to noticeable teeth whitening. Only active when teeth are visible in the frame. |

---

## Light and Color Adjustments

These settings modify the camera feed's lighting and color properties to compensate for poor lighting conditions.

### `lowLightAdjust`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `false` |
| Description | Automatically detects and compensates for low-light conditions. Brightens the video feed and reduces noise in dark environments. |
| Location | Settings > Video > Advanced |
| Behavior ON | Real-time brightness and noise reduction adjustments when low light is detected. |
| Behavior OFF | No automatic light adjustment. Camera's native auto-exposure is used. |
| Impact | Improved visibility in dark rooms. May introduce slight grain at extreme low light. |

### `autoLightCorrection`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` or `number` (0-100) |
| Default | `false` / `0` |
| Description | Applies automatic light correction to balance brightness across the face, reducing harsh shadows and overexposure. |
| Location | Effects Panel > Light & Color |
| Effect | Fills in shadows, reduces highlights, creates a more evenly-lit appearance. |

### `colorTemperature`

| Attribute | Detail |
|-----------|--------|
| Type | `number` |
| Default | `0` (neutral) |
| Range | `-100` (cool/blue) to `+100` (warm/yellow) |
| Description | Adjusts the color temperature of the video feed. Negative values shift toward blue (cooler), positive values shift toward yellow/orange (warmer). |
| Location | Effects Panel > Light & Color |
| Effect | Compensates for unflattering ambient lighting color. Cool settings can counteract yellow artificial light; warm settings can counteract blue/fluorescent light. |

### `exposure`

| Attribute | Detail |
|-----------|--------|
| Type | `number` |
| Default | `0` (neutral) |
| Range | `-100` (darker) to `+100` (brighter) |
| Description | Manually adjusts the overall brightness/exposure of the video feed. |
| Location | Effects Panel > Light & Color |
| Effect | Positive values brighten the image; negative values darken it. Useful for fine-tuning when auto-exposure doesn't produce the desired result. |

### `contrast`

| Attribute | Detail |
|-----------|--------|
| Type | `number` |
| Default | `0` (neutral) |
| Range | `-100` (flat/low contrast) to `+100` (high contrast) |
| Description | Adjusts the contrast of the video feed. Higher values increase the difference between light and dark areas. |
| Location | Effects Panel > Light & Color |
| Effect | Positive values make the image more vivid with deeper shadows and brighter highlights. Negative values flatten the image. |

---

## Filters

### `activeFilter`

| Attribute | Detail |
|-----------|--------|
| Type | `string` or `null` |
| Default | `null` (no filter) |
| Description | Applies a visual filter to the camera feed, similar to social media filters. Changes the overall look and feel of the video. |
| Location | Effects Panel > Filters |
| Options | Platform provides a set of pre-defined filters (e.g., warm, cool, vintage, B&W, vivid, soft, dramatic). Exact filter names depend on available presets. |
| Behavior | Selecting a filter applies it in real-time to the video preview and transmitted feed. Selecting `null` or "None" removes the filter. |
| Scope | Affects the transmitted video feed (other participants see the filter). |
| Note | Filters are applied AFTER skin enhancement and light/color adjustments in the processing pipeline. |

### Filter Processing Order

```
Raw Camera Feed
    |
    v
1. Low Light Adjustment (if enabled)
    |
    v
2. Skin Enhancement / Touch-Up (if enabled)
    |
    v
3. Light & Color Adjustments (exposure, contrast, color temperature)
    |
    v
4. Filter Application (activeFilter)
    |
    v
5. Virtual Background / Green Screen (if enabled)
    |
    v
Transmitted Video Feed
```

---

## Virtual Backgrounds

### `virtualBackground`

| Attribute | Detail |
|-----------|--------|
| Type | `string` or `null` |
| Default | `null` (no virtual background) |
| Description | Replaces the user's physical background with a virtual image or video. Uses AI-based person segmentation to separate the user from the background. |
| Location | Effects Panel > Backgrounds |
| Options | Pre-loaded backgrounds (images), custom uploaded backgrounds, blur, none |
| Technology | TensorFlow.js or similar ML model for person segmentation (body/portrait segmentation). Falls back to green screen mode if `greenScreen` is enabled. |

### `customBackgrounds`

| Attribute | Detail |
|-----------|--------|
| Type | `array` of image URLs/data |
| Default | `[]` (empty) |
| Description | User-uploaded custom background images. Stored locally and available across sessions. |
| Location | Effects Panel > Backgrounds > Custom |
| Upload | Click "+" or "Upload" button to add a custom image from local files |
| Supported formats | JPEG, PNG, WebP |
| Recommended size | 1920x1080 (16:9 aspect ratio) |
| Storage | Images stored in localStorage or IndexedDB. Not synced across devices. |

### `backgroundBlur`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `false` |
| Description | Blurs the user's physical background instead of replacing it. Provides privacy without a virtual background. |
| Location | Effects Panel > Backgrounds |
| Behavior ON | Background is blurred with the intensity controlled by `backgroundBlurIntensity`. User remains sharp. |
| Behavior OFF | Background is not blurred (unless a virtual background is active). |
| Priority | If both `virtualBackground` and `backgroundBlur` are enabled, `virtualBackground` takes precedence. |

### `backgroundBlurIntensity`

| Attribute | Detail |
|-----------|--------|
| Type | `number` (0-100) |
| Default | `70` |
| Description | Controls the intensity of the background blur effect. Higher values produce more blur. |
| Location | Effects Panel > Backgrounds (slider, visible when backgroundBlur is ON) |
| Range | 0 = very slight blur (almost no effect), 100 = maximum blur (background unrecognizable) |
| Interaction | Only active when `backgroundBlur` is `true` and `virtualBackground` is `null`. |

### Virtual Background Priority

```
Priority (highest to lowest):
1. virtualBackground (image/video replacement)
2. backgroundBlur (blur at backgroundBlurIntensity level)
3. greenScreen (chroma key replacement)
4. None (raw background)

If virtualBackground is set → it wins
Else if backgroundBlur is true → blur applied
Else if greenScreen is true AND physical green screen present → chroma replacement
Else → no background modification
```

---

## SkinEnhancementProcessor

### Overview

The `SkinEnhancementProcessor` is a class that manages the video processing pipeline for skin enhancement, touch-up, and beauty features. It handles initialization of the ML models, canvas processing, and cleanup.

### Class Interface

```javascript
class SkinEnhancementProcessor {
  // Static method to check if the browser/device supports skin enhancement
  static isSupported(): boolean

  // Instance lifecycle methods
  async init(videoElement: HTMLVideoElement, options: SkinEnhancementOptions): Promise<void>
  destroy(): void

  // Runtime configuration
  setOptions(options: Partial<SkinEnhancementOptions>): void
  getOptions(): SkinEnhancementOptions
}
```

### `isSupported()` Static Method

| Attribute | Detail |
|-----------|--------|
| Returns | `boolean` |
| Purpose | Checks if the current browser and device support the skin enhancement pipeline |
| Checks | WebGL2 support, canvas rendering capability, sufficient GPU/CPU power, Web Workers availability |
| Usage | Call before attempting to initialize. If `false`, skin enhancement features should be hidden or disabled in the UI. |

**Support matrix:**

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome 90+ | Supported | Supported (may be slower) |
| Firefox 88+ | Supported | Limited support |
| Safari 15+ | Supported | Supported (iOS 15+) |
| Edge 90+ | Supported | Supported |
| IE | Not supported | N/A |

### `init()` Method

| Attribute | Detail |
|-----------|--------|
| Parameters | `videoElement: HTMLVideoElement` - the camera video element to process; `options: SkinEnhancementOptions` - initial configuration |
| Returns | `Promise<void>` - resolves when initialization is complete |
| Purpose | Initializes the processing pipeline: loads ML models, creates canvas contexts, sets up processing loop |
| Performance | Initialization takes 1-3 seconds depending on device. Shows a loading indicator during init. |
| Error handling | Throws if device is not supported or resources cannot be allocated. Caller should catch and gracefully degrade. |

**Initialization sequence:**
```
init() called
    |
    v
1. Verify browser support (isSupported check)
    |
    v
2. Load ML model for face detection / landmark identification
    |
    v
3. Create offscreen canvas for processing
    |
    v
4. Set up WebGL2 context for GPU-accelerated processing
    |
    v
5. Start processing loop (requestAnimationFrame-based)
    |
    v
6. Apply initial options (touchUpLevel, skinToneEven, etc.)
    |
    v
7. Resolve promise → processing is active
```

### `destroy()` Method

| Attribute | Detail |
|-----------|--------|
| Parameters | None |
| Returns | `void` |
| Purpose | Tears down the processing pipeline, releases GPU/memory resources, stops the processing loop |
| When called | When leaving the session, disabling touch-up, or switching cameras |
| Importance | MUST be called to prevent memory leaks. The processor holds GPU textures, canvas contexts, and ML model data. |

**Destruction sequence:**
```
destroy() called
    |
    v
1. Stop requestAnimationFrame processing loop
    |
    v
2. Release WebGL2 textures and buffers
    |
    v
3. Close offscreen canvas
    |
    v
4. Unload ML model from memory
    |
    v
5. Clear all internal references
    |
    v
6. Processor is now inactive (must call init() again to reuse)
```

### Lifecycle Management

The `SkinEnhancementProcessor` follows a strict lifecycle:

```
+-------------------+
|   NOT INITIALIZED  |
| (initial state)    |
+--------+----------+
         |
         | init()
         v
+-------------------+
|      ACTIVE        |
| (processing frames)|
+--------+----------+
         |
         | destroy()
         v
+-------------------+
|    DESTROYED       |
| (resources freed)  |
+-------------------+
```

**Key rules:**
- `init()` can only be called from NOT INITIALIZED state
- `destroy()` can only be called from ACTIVE state
- After `destroy()`, a new instance must be created or `init()` called again
- `setOptions()` can only be called during ACTIVE state
- Switching cameras requires `destroy()` then `init()` with the new video element

### SkinEnhancementOptions

The options object passed to `init()` and `setOptions()`:

```javascript
{
  touchUpLevel: 50,          // number (0-100)
  skinToneEven: 0,           // number (0-100)
  blemishReduction: 0,       // number (0-100)
  eyeBrightness: 0,          // number (0-100)
  teethWhitening: 0,         // number (0-100)
  autoLightCorrection: 0,    // number (0-100) or boolean
  colorTemperature: 0,       // number (-100 to +100)
  exposure: 0,               // number (-100 to +100)
  contrast: 0,               // number (-100 to +100)
  activeFilter: null,        // string or null
}
```

---

## Screen Sharing

### Initiating Screen Share

1. User clicks the screen share button in BottomControls
2. Browser's native screen picker dialog appears
3. User selects what to share:
   - **Entire screen** - Full desktop/monitor
   - **Application window** - A specific application window
   - **Browser tab** - A specific browser tab (with optional audio)
4. On selection, `isScreenSharing` is set to `true`
5. Screen share feed is added to the session

### Screen Share Behavior in Layouts

| Layout Type | Screen Share Behavior |
|-------------|----------------------|
| Meeting: `gallery` | Screen share takes the largest tile; participants shrink |
| Meeting: `speaker_filmstrip` | Screen share replaces the main area |
| Meeting: `screen_thumbnails` | Screen share fills 80%; participant thumbnails in 20% |
| Meeting: `presenter_pip` | Screen share fills canvas; presenter in PiP |
| Meeting: `focus` | Screen share fills canvas entirely |
| Webinar: any | Screen share appears in the content area; host may be in PiP |
| Live Stream: any | Screen share can be assigned to a scene or used as a media source |

### Screen Share Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Share audio | `boolean` | `false` | Share system audio along with screen (browser tab audio). Only supported when sharing a browser tab in Chrome. |
| Optimize for video | `boolean` | `false` | When enabled, prioritizes frame rate over resolution. Better for sharing videos or animations. |

### Ending Screen Share

- Click the screen share button again in BottomControls
- Click the "Stop Sharing" button in the browser's native screen share indicator
- Close/minimize the shared application window (some browsers auto-stop)
- `isScreenSharing` is set to `false`

---

## Setup Page Details

### Device Selection and Management

The Setup Page (before joining the session) provides comprehensive device selection:

#### Camera Selection

| Feature | Detail |
|---------|--------|
| Dropdown | Lists all `videoinput` devices from `enumerateDevices()` |
| Preview | Live video preview from selected camera |
| Switch | Instantly switches preview when a different camera is selected |
| Default | System default camera, or last used camera (stored in localStorage) |
| None option | "No Camera" option available for audio-only participation |
| Label display | Shows device label (e.g., "HD Pro Webcam C920") when permissions granted; "Camera 1", "Camera 2" when permissions not yet granted |

#### Microphone Selection

| Feature | Detail |
|---------|--------|
| Dropdown | Lists all `audioinput` devices from `enumerateDevices()` |
| Audio meter | Live audio level meter shows input from selected mic |
| Switch | Instantly switches audio input when a different mic is selected |
| Default | System default mic, or last used mic (stored in localStorage) |
| None option | "No Microphone" option available for listen-only participation |
| Label display | Shows device label when permissions granted |

#### Speaker Selection

| Feature | Detail |
|---------|--------|
| Dropdown | Lists all `audiooutput` devices from `enumerateDevices()` |
| Test button | Plays a test tone through the selected speaker |
| Default | System default speaker |
| Browser support | Requires `HTMLMediaElement.setSinkId()` support. Not available in all browsers (notably Firefox has limited support). |
| Fallback | When `setSinkId` is not supported, shows "Speaker selection not supported in this browser" with the system default being used. |

### Audio Level Meter (Detailed)

The audio level meter provides visual confirmation that the microphone is working:

| Attribute | Detail |
|-----------|--------|
| Implementation | Web Audio API: `AudioContext` > `MediaStreamSource` > `AnalyserNode` |
| Update frequency | ~60 FPS (tied to `requestAnimationFrame`) |
| Visualization type | Horizontal bar with optional frequency spectrum |
| Data source | `AnalyserNode.getByteFrequencyData()` for frequency visualization or `AnalyserNode.getByteTimeDomainData()` for waveform |
| Bar behavior | Bounces in real-time with audio input; at rest when silent |
| Color | Green for normal levels, yellow for moderate, red for clipping/too loud |
| Purpose | Confirms mic is picking up audio; helps user adjust speaking volume and mic distance |

**Technical implementation flow:**
```
1. Get microphone MediaStream from selected device
    |
    v
2. Create AudioContext
    |
    v
3. Create MediaStreamSource from the mic stream
    |
    v
4. Create AnalyserNode (fftSize: 256 or 512)
    |
    v
5. Connect: MediaStreamSource → AnalyserNode
    |
    v
6. In animation loop:
   a. Call analyser.getByteFrequencyData(dataArray)
   b. Calculate average volume level from frequency data
   c. Render bar/spectrum visualization to canvas or DOM element
    |
    v
7. On mic change or page leave:
   a. Disconnect nodes
   b. Close AudioContext
```

### Permission Status Indicators

Each device permission shows a status badge:

| Permission | Status Values | Visual |
|------------|--------------|--------|
| Camera | `pending` / `granted` / `denied` | Yellow clock / Green check / Red X |
| Microphone | `pending` / `granted` / `denied` | Yellow clock / Green check / Red X |

**Detailed status descriptions:**

| Status | Meaning | User Action |
|--------|---------|-------------|
| `pending` | Permission has not been requested yet, or the browser prompt is showing | Wait for browser prompt to appear; click "Allow" when it does |
| `granted` | Permission was given; device is accessible | No action needed. Device is working. |
| `denied` | Permission was explicitly denied by the user or is blocked at browser/OS level | Click the lock/camera icon in the address bar > Allow > Refresh the page. On macOS, check System Preferences > Privacy > Camera/Microphone. On Windows, check Settings > Privacy > Camera/Microphone. |

### Setup Page Persistence

| Setting | Persisted | Storage |
|---------|-----------|---------|
| Selected camera device ID | Yes | localStorage |
| Selected microphone device ID | Yes | localStorage |
| Selected speaker device ID | Yes | localStorage |
| Display name | Yes | localStorage (or from user account) |
| Camera on/off preference | Yes | localStorage (via `cameraOffOnJoin`) |
| Mic mute preference | Yes | localStorage (via `muteOnJoin`) |

---

## Complete Settings Reference Table

All media-related settings in one table:

| Setting | Type | Default | Range | Category | Description |
|---------|------|---------|-------|----------|-------------|
| `isMuted` | boolean | false | - | Core | Microphone mute state |
| `isCameraOn` | boolean | true | - | Core | Camera on/off state |
| `isScreenSharing` | boolean | false | - | Core | Screen sharing state |
| `mirrorVideo` | boolean | true | - | Video | Mirror self-view |
| `hdVideo` | boolean | false | - | Video | High-definition video |
| `muteOnJoin` | boolean | false | - | Audio | Auto-mute on join |
| `cameraOffOnJoin` | boolean | false | - | Video | Auto camera off on join |
| `colorMode` | string | 'dark' | 'dark'/'light' | General | UI color scheme |
| `noiseSuppression` | boolean | true | - | Audio | AI noise suppression |
| `autoAdjustMic` | boolean | true | - | Audio | Auto mic level |
| `touchUpAppearance` | boolean | false | - | Appearance | Master touch-up toggle |
| `touchUpLevel` | number | 50 | 0-100 | Appearance | Touch-up intensity |
| `greenScreen` | boolean | false | - | Appearance | Chroma key mode |
| `skinToneEven` | number | 0 | 0-100 | Skin | Skin tone evening |
| `blemishReduction` | number | 0 | 0-100 | Skin | Blemish reduction |
| `eyeBrightness` | number | 0 | 0-100 | Skin | Eye brightness |
| `teethWhitening` | number | 0 | 0-100 | Skin | Teeth whitening |
| `lowLightAdjust` | boolean | false | - | Light | Low-light compensation |
| `autoLightCorrection` | number/bool | 0/false | 0-100 | Light | Auto light correction |
| `colorTemperature` | number | 0 | -100 to +100 | Light | Color temperature |
| `exposure` | number | 0 | -100 to +100 | Light | Exposure adjustment |
| `contrast` | number | 0 | -100 to +100 | Light | Contrast adjustment |
| `activeFilter` | string/null | null | preset names | Filter | Active video filter |
| `virtualBackground` | string/null | null | image URLs | Background | Virtual background |
| `customBackgrounds` | array | [] | - | Background | Custom uploaded backgrounds |
| `backgroundBlur` | boolean | false | - | Background | Background blur |
| `backgroundBlurIntensity` | number | 70 | 0-100 | Background | Blur intensity |

---

## Troubleshooting Guide

### Symptom: Microphone not working (no audio transmitted)

**Diagnostic steps:**
1. Check `isMuted` state - is the mic muted? (look for red mic icon)
2. Check permission status - is microphone permission granted?
3. Check the audio level meter on the setup page - does it show activity?
4. Verify the correct microphone is selected in the dropdown
5. Test the microphone in another application

**Common fixes:**
- Click the mic button to unmute
- Grant microphone permission in browser settings
- Select the correct microphone from the device dropdown
- Close other applications that may be using the mic exclusively
- Restart the browser if the mic was recently plugged in (device enumeration may need refresh)
- Check OS-level microphone privacy settings (Windows: Settings > Privacy > Microphone)

### Symptom: Camera shows black/frozen image

**Diagnostic steps:**
1. Check `isCameraOn` state
2. Check camera permission status
3. Verify the correct camera is selected
4. Check if another application is using the camera

**Common fixes:**
- Click the camera button to turn it on
- Grant camera permission in browser settings
- Select a different camera from the dropdown
- Close Zoom, Teams, or other apps that lock the camera
- Check OS camera privacy settings
- Try unplugging and replugging the external camera

### Symptom: Touch-up / skin enhancement not working

**Diagnostic steps:**
1. Check if `touchUpAppearance` is enabled
2. Verify the browser supports `SkinEnhancementProcessor` (call `isSupported()`)
3. Check browser console for WebGL errors
4. Verify sufficient GPU resources

**Common fixes:**
- Enable `touchUpAppearance` in settings
- Use Chrome for best support
- Enable hardware acceleration in browser settings (chrome://settings > Advanced > System > "Use hardware acceleration")
- Close GPU-intensive applications
- Update graphics drivers

### Symptom: Virtual background has rough edges / person cutout is bad

**Diagnostic steps:**
1. Check lighting - is the user well-lit?
2. Check if `greenScreen` mode might produce better results
3. Check the contrast between the user and their physical background

**Common fixes:**
- Improve lighting (face should be well-lit, avoid backlighting)
- Use a solid, contrasting physical background
- Enable `greenScreen` mode with a physical green screen for best results
- Lower camera resolution (sometimes helps segmentation model performance)
- Try a different virtual background image (some work better than others)

### Symptom: Screen share is laggy / low quality

**Diagnostic steps:**
1. Check internet bandwidth
2. Check if "Optimize for video" is enabled (improves frame rate at cost of resolution)
3. Check if HD video is enabled (competing for bandwidth)
4. Verify CPU usage

**Common fixes:**
- Enable "Optimize for video" if sharing video content
- Disable HD video to free bandwidth for screen share
- Close unnecessary browser tabs and applications
- Share a specific window instead of entire screen (less data to capture)
- Share a browser tab (most efficient mode in Chrome)

### Symptom: Audio echo or feedback

**Diagnostic steps:**
1. Check if the user is using speakers (not headphones)
2. Check if noise suppression is enabled
3. Check if multiple audio output devices are playing simultaneously

**Common fixes:**
- Use headphones/earbuds to eliminate echo
- Enable `noiseSuppression`
- Reduce speaker volume
- Increase physical distance between microphone and speakers
- Use a headset with built-in microphone

### Symptom: Low-light adjustment makes video grainy

**Diagnostic steps:**
1. `lowLightAdjust` is designed for dim environments but can introduce noise
2. Check actual lighting conditions

**Common fixes:**
- Add more physical lighting (desk lamp, ring light)
- Adjust `exposure` manually instead of using auto low-light
- Reduce camera resolution (less noise at lower resolution)
- Balance `lowLightAdjust` with `touchUpAppearance` for smoother result

### Symptom: Audio level meter shows activity but others can't hear

**Diagnostic steps:**
1. Check `isMuted` state (the meter shows local input, mute only affects transmission)
2. Check network connectivity
3. Check if `autoAdjustMic` is adjusting level too low

**Common fixes:**
- Unmute the microphone
- Check internet connection
- Disable `autoAdjustMic` and manually increase system mic volume
- Rejoin the session to reset the audio connection

---

## Frequently Asked Questions

### Q: Do other participants see my touch-up effects?
**A:** Yes. Touch-up, skin enhancement, filters, and virtual backgrounds are applied to the video feed before it is transmitted. All participants see the processed video, not the raw camera feed.

### Q: Does mirroring affect what others see?
**A:** No. The `mirrorVideo` setting only affects your self-view. Other participants always see the non-mirrored (true orientation) video. Text behind you will appear correctly to others even if it looks reversed to you.

### Q: Can I use a virtual background without a green screen?
**A:** Yes. R-Link uses AI-based person segmentation that works without a physical green screen. The `greenScreen` option is an alternative mode for users who have a physical green/blue backdrop, which provides cleaner edges.

### Q: Why can't I select a speaker on Firefox?
**A:** Speaker selection requires the `HTMLMediaElement.setSinkId()` API, which Firefox does not fully support. On Firefox, audio plays through the system default speaker. Use Chrome, Edge, or Safari for speaker selection.

### Q: Will noise suppression affect music or non-speech audio?
**A:** Yes. Noise suppression is optimized for speech and will likely suppress or degrade music, instruments, and other non-speech audio. Disable `noiseSuppression` when sharing music or non-speech audio.

### Q: Can I save my effects settings as a preset?
**A:** Currently, there is no preset/profile system for effects settings. Settings are saved individually in localStorage and persist between sessions, but you cannot create named presets to switch between different configurations.

### Q: What is the performance impact of all effects enabled simultaneously?
**A:** Enabling all effects (touch-up, skin enhancement, virtual background, filters, light adjustments) will significantly increase CPU and GPU usage. On lower-end devices, this may cause frame drops. Recommended to enable only the effects you need. Most impactful: virtual background > skin enhancement > filters.

### Q: Does screen sharing share my cursor?
**A:** Yes, when sharing an entire screen or application window, your cursor is visible to other participants. When sharing a browser tab, cursor visibility depends on the browser.

### Q: Can I change devices during a live session?
**A:** Yes. Camera, microphone, and speaker can be changed via the Settings panel during a live session. The switch happens in real-time. For camera changes, the `SkinEnhancementProcessor` will need to reinitialize (brief visual flicker may occur).

---

## Known Limitations

1. **No multi-camera support:** Users can only have one active camera at a time. Switching cameras during a session requires the video feed to briefly reinitialize.

2. **Virtual background quality varies:** AI-based segmentation quality depends on lighting, background contrast, and device processing power. Hair edges and transparent objects (glasses) may not segment cleanly.

3. **Speaker selection browser support:** `setSinkId` is not universally supported. Firefox and some Safari versions cannot change the audio output device. Users must change their default speaker at the OS level.

4. **No persistent effect presets:** Users cannot create named profiles for different effect configurations. All settings are saved as individual values.

5. **SkinEnhancementProcessor requires GPU:** Skin enhancement features require WebGL2 support and a capable GPU. Devices without GPU support (some virtual machines, very old devices) cannot use these features.

6. **Screen share audio limited to Chrome:** Sharing system/tab audio during screen share is only supported in Chrome when sharing a browser tab. Other browsers and share modes do not support audio sharing.

7. **Custom backgrounds not synced:** Custom uploaded backgrounds are stored in localStorage/IndexedDB and do not sync across devices or browsers. Users must re-upload backgrounds on each device.

8. **No recording of individual audio tracks:** The platform records the mixed audio output. Individual participant audio tracks cannot be separated in post-production.

9. **Touch-up processing adds latency:** Skin enhancement processing adds a small amount of latency (~10-30ms) to the video feed. This is generally imperceptible but may be noticeable on very slow devices.

10. **Filter preview not available before joining:** Video filters can only be previewed after joining the session. The setup page shows the raw camera feed without filter options.

---

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Camera/mic controls | Yes | Yes |
| Screen sharing | Yes | Yes |
| Mirror video | Yes | Yes |
| HD video | No | Yes |
| Noise suppression | Yes | Yes |
| Auto-adjust mic | Yes | Yes |
| Mute/camera off on join | Yes | Yes |
| Color mode (dark/light) | Yes | Yes |
| Touch-up appearance (basic) | Yes | Yes |
| Touch-up level slider | Yes | Yes |
| Skin tone evening | No | Yes |
| Blemish reduction | No | Yes |
| Eye brightness | No | Yes |
| Teeth whitening | No | Yes |
| Low-light adjustment | Yes | Yes |
| Auto light correction | No | Yes |
| Color temperature | No | Yes |
| Exposure adjustment | No | Yes |
| Contrast adjustment | No | Yes |
| Video filters | No | Yes |
| Virtual backgrounds (preset) | Yes (limited set) | Yes (full set) |
| Custom background upload | No | Yes |
| Background blur | Yes | Yes |
| Green screen mode | No | Yes |

---

## Related Documents

- [05 - Authentication and Access](./05-authentication-and-access.md) - Media settings are per-user and tied to the authenticated session
- [06 - Rooms Management](./06-rooms-management.md) - Room settings interact with the entry flow before the setup page
- [07 - Session Types](./07-session-types.md) - Session type determines which features are available in the studio
- [08 - Studio Interface](./08-studio-interface.md) - The studio layout where media controls are accessed and used
