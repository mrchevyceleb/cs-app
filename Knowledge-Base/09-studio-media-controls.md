# Studio Media Controls

## Overview

R-Link's Studio provides a comprehensive set of media controls that manage microphone, camera, screen sharing, virtual backgrounds, appearance enhancement, and lighting/color adjustments. These controls are accessible primarily through the BottomControls bar and the settings panel within the Studio. Each control has a corresponding state variable that persists during the session and can be configured with default values (such as muting on join). Additionally, the Studio includes a `SkinEnhancementProcessor` class that applies real-time video processing for appearance touch-ups, with hardware compatibility checks via the `isSupported()` method.

This document covers every toggle, slider, and setting in the media controls system, including their defaults, behaviors, and troubleshooting guidance.

---

## Microphone Controls

### Mute / Unmute

| Setting | Details |
|---|---|
| State variable | `isMuted` |
| Control location | BottomControls bar (microphone icon) |
| Default | Unmuted (unless `muteOnJoin` is enabled) |
| Behavior | Toggles the local microphone audio stream on/off |
| Visual indicator | Microphone icon turns red/crossed when muted |
| Keyboard shortcut | Spacebar (hold to temporarily unmute while muted) |

**Step-by-step:**
1. Locate the microphone icon in the BottomControls bar.
2. Click once to toggle mute/unmute.
3. When muted, the icon shows a red slash through the microphone.
4. When unmuted, the icon shows a normal microphone.
5. Other participants will see a muted indicator next to your name when you are muted.

### Noise Suppression

| Setting | Details |
|---|---|
| Setting name | `noiseSuppression` |
| Type | Boolean toggle |
| Default | Varies by browser/device |
| Location | Settings panel > Audio settings |
| Description | Filters out background noise (keyboard typing, fans, ambient sounds) using AI-based noise cancellation |

**How it works:**
- When enabled, the audio stream is processed through a noise suppression filter before being sent to other participants.
- Effective for reducing keyboard sounds, fan noise, pet sounds, and mild background conversations.
- May slightly alter voice quality at aggressive levels.
- Not effective for very loud or continuous noise sources (construction, heavy music).

### Auto-Adjust Microphone

| Setting | Details |
|---|---|
| Setting name | `autoAdjustMic` |
| Type | Boolean toggle |
| Default | Varies |
| Location | Settings panel > Audio settings |
| Description | Automatically adjusts microphone input level to maintain consistent volume |

**How it works:**
- When enabled, the system monitors the microphone input level and automatically adjusts gain to prevent audio that is too quiet or too loud.
- Useful for users who move closer to or farther from their microphone during a session.
- May conflict with external audio processing software; disable if using professional audio equipment with its own gain control.

### Mute on Join

| Setting | Details |
|---|---|
| Setting name | `muteOnJoin` |
| Type | Boolean toggle |
| Default | `false` |
| Location | Settings panel > Audio settings |
| Description | When enabled, the microphone starts muted when joining any session |

**Use cases:**
- Joining a large meeting where you want to listen first.
- Preventing accidental audio when entering a session.
- Default setting for team members who frequently join ongoing sessions.

---

## Camera Controls

### Camera On / Off

| Setting | Details |
|---|---|
| State variable | `isCameraOn` |
| Control location | BottomControls bar (camera icon) |
| Default | On (unless `cameraOffOnJoin` is enabled) |
| Behavior | Toggles the local camera video stream on/off |
| Visual indicator | Camera icon turns red/crossed when off |

**Step-by-step:**
1. Locate the camera icon in the BottomControls bar.
2. Click once to toggle camera on/off.
3. When off, your video tile shows a placeholder (avatar or initials).
4. When on, your live video feed is visible to other participants.

### Mirror Video

| Setting | Details |
|---|---|
| Setting name | `mirrorVideo` |
| Type | Boolean toggle |
| Default | Varies |
| Location | Settings panel > Video settings |
| Description | Mirrors the local video preview horizontally (like looking in a mirror) |

**Important notes:**
- Mirroring only affects the **local preview** (what you see of yourself).
- Other participants always see the **non-mirrored** (correct) version.
- Most users prefer mirrored view because it feels more natural (matches their mirror at home).
- Text on the user's side (e.g., on a whiteboard behind them) will appear reversed in their preview but correct for others.

### HD Video

| Setting | Details |
|---|---|
| Setting name | `hdVideo` |
| Type | Boolean toggle |
| Default | Varies |
| Location | Settings panel > Video settings |
| Description | Enables high-definition video output (720p or 1080p depending on camera and network) |

**Impact:**
- Higher video quality for better visual clarity.
- Requires more bandwidth (approximately 1.5-3 Mbps upload for 720p, 3-6 Mbps for 1080p).
- May cause lag or frame drops on slow connections.
- Disable if experiencing network issues or if the customer reports choppy video.

### Camera Off on Join

| Setting | Details |
|---|---|
| Setting name | `cameraOffOnJoin` |
| Type | Boolean toggle |
| Default | `false` |
| Location | Settings panel > Video settings |
| Description | When enabled, the camera starts off when joining any session |

---

## Device Selection

### Selecting Audio and Video Devices

The settings panel provides device selection dropdowns for:

| Device Type | Description |
|---|---|
| Microphone | Select from available audio input devices |
| Speaker/Output | Select from available audio output devices |
| Camera | Select from available video input devices |

**Step-by-step:**
1. Open the Settings panel (gear icon in TopBar or BottomControls).
2. Navigate to the Audio or Video settings section.
3. Click the dropdown for the device type you want to change.
4. Select the desired device from the list.
5. The change takes effect immediately.

**Troubleshooting device selection:**
- If no devices appear, the browser may not have permission to access media devices.
- If a device was plugged in after the page loaded, try refreshing the page.
- If using Bluetooth headphones, ensure they are connected and selected as both input and output.

---

## Virtual Backgrounds

### Overview

Virtual backgrounds replace the user's real background with an image or blur effect. This feature uses the camera feed and applies real-time background segmentation.

### State Variables

| Variable | Type | Description |
|---|---|---|
| `virtualBackground` | String / null | Currently selected virtual background (null = no background) |
| `customBackgrounds` | Array | List of user-uploaded custom background images |

### Available Options

| Option | Description |
|---|---|
| None | No virtual background (shows real background) |
| Blur | Blurs the real background while keeping the user in focus |
| Built-in images | Pre-loaded background images provided by R-Link |
| Custom images | User-uploaded images from `customBackgrounds` array |

### Step-by-Step: Applying a Virtual Background

1. Open the Settings panel or click the virtual background button (if available in BottomControls).
2. Navigate to the **Background** section.
3. Choose from:
   - **None**: Removes any virtual background.
   - **Blur**: Applies a Gaussian blur to your real background.
   - **Built-in**: Select from pre-loaded images.
   - **Custom**: Click "Upload" to add your own image, then select it.
4. The background is applied immediately in real-time.

### Custom Background Upload

- Supported formats: JPEG, PNG.
- Recommended resolution: 1920x1080 or higher for best quality.
- Uploaded backgrounds are stored in the `customBackgrounds` array and persist across sessions.
- There is no strict limit on the number of custom backgrounds, but excessive uploads may impact performance.

### Green Screen Mode

| Setting | Details |
|---|---|
| Setting name | `greenScreen` |
| Type | Boolean toggle |
| Default | `false` |
| Location | Settings panel > Background settings |
| Description | Enables green screen mode for physical green screen setups |

**How it works:**
- When enabled, the system uses chroma key processing instead of AI-based background segmentation.
- Requires a physical green screen behind the user.
- Provides cleaner background replacement than AI segmentation, especially around hair and edges.
- Best for professional setups with proper lighting.

---

## Touch-Up Appearance

### Overview

The touch-up appearance feature applies real-time skin enhancement to the user's video feed using the `SkinEnhancementProcessor` class. It provides subtle cosmetic improvements without requiring external software.

### Main Toggle

| Setting | Details |
|---|---|
| Setting name | `touchUpAppearance` |
| Type | Boolean toggle |
| Default | `false` |
| Location | Settings panel > Video settings > Touch Up |
| Description | Enables or disables all touch-up appearance processing |

### Touch-Up Level

| Setting | Details |
|---|---|
| Setting name | `touchUpLevel` |
| Type | Number (slider) |
| Range | 0 to 100 (or equivalent scale) |
| Default | Mid-level |
| Location | Settings panel > Video settings > Touch Up |
| Description | Controls the overall intensity of the touch-up effect |

### Individual Enhancement Settings

When touch-up is enabled, the following individual enhancements are available:

#### Skin Tone Evening

| Setting | Details |
|---|---|
| Setting name | `skinToneEven` |
| Type | Toggle / slider |
| Description | Evens out skin tone variations, reducing redness and discoloration |

#### Blemish Reduction

| Setting | Details |
|---|---|
| Setting name | `blemishReduction` |
| Type | Toggle / slider |
| Description | Reduces the visibility of blemishes, spots, and skin imperfections |

#### Eye Brightness

| Setting | Details |
|---|---|
| Setting name | `eyeBrightness` |
| Type | Toggle / slider |
| Description | Enhances the brightness and clarity of the eyes |

#### Teeth Whitening

| Setting | Details |
|---|---|
| Setting name | `teethWhitening` |
| Type | Toggle / slider |
| Description | Whitens teeth appearance in the video feed |

### SkinEnhancementProcessor Class

The `SkinEnhancementProcessor` is the underlying class that performs the real-time video processing:

| Method | Description |
|---|---|
| `isSupported()` | Static method that checks if the user's browser and hardware support skin enhancement processing. Returns `true` or `false`. |
| `init()` | Initializes the processor, setting up the video processing pipeline. Must be called before processing begins. |
| `destroy()` | Cleans up resources, stops processing, and releases the video pipeline. Must be called when the session ends or when touch-up is disabled. |

### Lifecycle

1. **Check support**: Call `SkinEnhancementProcessor.isSupported()` to determine if the feature is available on the user's device.
2. **Initialize**: When touch-up is enabled, call `init()` to start the processing pipeline.
3. **Process**: Video frames are processed in real-time with the configured enhancement settings.
4. **Destroy**: When touch-up is disabled or the session ends, call `destroy()` to release resources.

### Hardware Requirements

The `isSupported()` check evaluates:
- WebGL support in the browser.
- GPU capabilities (hardware acceleration required).
- Browser version compatibility.
- Available memory for real-time video processing.

If `isSupported()` returns `false`, the touch-up controls should be hidden or disabled in the UI. The customer should be informed that their device does not support this feature.

---

## Light and Color Adjustments

### Auto Light Correction

| Setting | Details |
|---|---|
| Setting name | `autoLightCorrection` |
| Type | Boolean toggle |
| Default | Varies |
| Location | Settings panel > Video settings > Light & Color |
| Description | Automatically adjusts brightness and exposure to compensate for poor lighting |

### Low Light Adjust

| Setting | Details |
|---|---|
| Setting name | `lowLightAdjust` |
| Type | Boolean toggle |
| Default | Varies |
| Location | Settings panel > Video settings > Light & Color |
| Description | Specifically enhances video quality in low-light conditions by boosting brightness and reducing noise |

### Color Temperature

| Setting | Details |
|---|---|
| Setting name | `colorTemperature` |
| Type | Number (slider) |
| Range | Cool (blue) to warm (yellow) |
| Default | Neutral |
| Location | Settings panel > Video settings > Light & Color |
| Description | Adjusts the color temperature (warmth/coolness) of the video feed |

### Exposure

| Setting | Details |
|---|---|
| Setting name | `exposure` |
| Type | Number (slider) |
| Range | Under-exposed to over-exposed |
| Default | Neutral |
| Location | Settings panel > Video settings > Light & Color |
| Description | Manually adjusts the brightness/exposure of the video feed |

### Contrast

| Setting | Details |
|---|---|
| Setting name | `contrast` |
| Type | Number (slider) |
| Range | Low contrast to high contrast |
| Default | Neutral |
| Location | Settings panel > Video settings > Light & Color |
| Description | Adjusts the contrast between light and dark areas of the video feed |

---

## Filters

### Active Filter

| Setting | Details |
|---|---|
| Setting name | `activeFilter` |
| Type | String / null |
| Default | `null` (no filter) |
| Location | Settings panel > Video settings > Filters |
| Description | Applies a visual filter to the camera feed (similar to Instagram-style filters) |

**Available filters may include:**
- None (default)
- Warm
- Cool
- Vintage
- Black & White
- High Contrast
- Soft Focus
- Additional filters based on platform updates

**Note:** Filters are applied to the local video feed and are visible to all participants. The exact list of available filters may vary.

---

## Screen Sharing

### Toggle Screen Sharing

| Setting | Details |
|---|---|
| State variable | `isScreenSharing` |
| Control location | BottomControls bar (screen share icon) |
| Default | Off |
| Behavior | Opens the browser's screen share picker, then broadcasts the selected source |

### Step-by-Step: Sharing Your Screen

1. Click the **Screen Share** button in the BottomControls bar.
2. The browser's native screen share dialog appears with options:
   - **Entire Screen**: Shares everything visible on the selected monitor.
   - **Application Window**: Shares a specific application window.
   - **Browser Tab**: Shares a specific browser tab (Chrome/Edge).
3. Select the desired source and click **Share**.
4. The shared content appears in the canvas area according to the active layout.
5. To stop sharing, click the **Stop Share** button or the browser's stop sharing indicator.

### Screen Share Layouts

When screen sharing is active, certain layouts are optimized:

| Session Type | Optimized Layout | Description |
|---|---|---|
| Meeting | `screen_thumbnails` | Screen takes 80%, participants in 20% sidebar |
| Meeting | `presenter_pip` | Screen fullscreen, presenter in PiP |
| Webinar | `content_focus` | Shared content fullscreen |
| Webinar | `content_host_pip` | Content fullscreen, host in PiP |
| Live Stream | `live_media` | Media/screen fullscreen |
| Live Stream | `live_media_pip` | Media/screen fullscreen, host in PiP |

---

## Complete Settings Object Structure

The following is the complete settings object with all media control fields:

```
Settings {
  // Audio
  isMuted: Boolean,              // Current mute state
  noiseSuppression: Boolean,     // AI noise cancellation
  autoAdjustMic: Boolean,        // Auto mic level adjustment
  muteOnJoin: Boolean,           // Mute when joining session

  // Camera
  isCameraOn: Boolean,           // Current camera state
  mirrorVideo: Boolean,          // Mirror local preview
  hdVideo: Boolean,              // HD video output
  cameraOffOnJoin: Boolean,      // Camera off when joining

  // Background
  virtualBackground: String|null, // Current virtual background
  customBackgrounds: Array,       // User-uploaded backgrounds
  greenScreen: Boolean,           // Green screen mode

  // Touch-Up Appearance
  touchUpAppearance: Boolean,     // Master touch-up toggle
  touchUpLevel: Number,           // Overall intensity
  skinToneEven: Boolean|Number,   // Skin tone evening
  blemishReduction: Boolean|Number, // Blemish reduction
  eyeBrightness: Boolean|Number,  // Eye brightness
  teethWhitening: Boolean|Number, // Teeth whitening

  // Light & Color
  autoLightCorrection: Boolean,   // Auto light correction
  lowLightAdjust: Boolean,        // Low light enhancement
  colorTemperature: Number,       // Color warmth/coolness
  exposure: Number,               // Brightness adjustment
  contrast: Number,               // Contrast adjustment

  // Filters
  activeFilter: String|null,      // Active visual filter

  // Screen Share
  isScreenSharing: Boolean,       // Screen sharing state

  // Recording
  isRecording: Boolean,           // Recording state
  recordingMode: 'local'|'cloud', // Recording destination
  multiTrackEnabled: Boolean,     // Multi-track recording

  // Session
  isLive: Boolean,                // Live streaming state
  colorMode: String,              // UI color theme

  // Sidebars
  leftSidebarCollapsed: Boolean,  // Left sidebar state (default: true)
  rightSidebarCollapsed: Boolean  // Right sidebar state (default: true)
}
```

---

## Troubleshooting

### Issue: Microphone Not Working

| Step | Action |
|---|---|
| 1 | Check if the microphone is muted (look for red/crossed mic icon) |
| 2 | Check browser permissions: browser should have microphone access granted for the R-Link domain |
| 3 | Check device selection: ensure the correct microphone is selected in Settings |
| 4 | Check if another application is using the microphone exclusively |
| 5 | Try unplugging and re-plugging the microphone |
| 6 | Try a different browser |
| 7 | On macOS, check System Preferences > Privacy > Microphone permissions |
| 8 | On Windows, check Settings > Privacy > Microphone permissions |

### Issue: Camera Not Working

| Step | Action |
|---|---|
| 1 | Check if the camera is turned off (look for red/crossed camera icon) |
| 2 | Check browser permissions: browser should have camera access granted |
| 3 | Check device selection: ensure the correct camera is selected |
| 4 | Check if another application is using the camera (Zoom, Teams, etc.) |
| 5 | Check if `cameraOffOnJoin` is enabled (camera starts off by default) |
| 6 | Try refreshing the page |
| 7 | Check OS-level privacy settings for camera access |
| 8 | Try a different browser or device |

### Issue: Virtual Background Not Working or Looks Bad

| Step | Action |
|---|---|
| 1 | Check if the device supports virtual backgrounds (requires GPU acceleration) |
| 2 | Ensure good lighting (backlit conditions make segmentation worse) |
| 3 | Use a solid-colored background for better edge detection |
| 4 | Try the green screen mode with a physical green screen for best results |
| 5 | Reduce video resolution if performance is poor |
| 6 | Close other GPU-intensive applications |

### Issue: Touch-Up Appearance Not Available

| Step | Action |
|---|---|
| 1 | The feature requires `SkinEnhancementProcessor.isSupported()` to return `true` |
| 2 | Check that the browser supports WebGL (type `chrome://gpu` in Chrome address bar) |
| 3 | Ensure hardware acceleration is enabled in browser settings |
| 4 | The feature may not work on older devices or integrated GPUs |
| 5 | Try using Chrome or Edge (best WebGL support) |
| 6 | If the feature is unavailable, the customer's device does not meet hardware requirements |

### Issue: Audio Echo or Feedback

| Step | Action |
|---|---|
| 1 | Use headphones instead of speakers to prevent echo |
| 2 | Enable noise suppression |
| 3 | Reduce speaker volume |
| 4 | Ensure only one browser tab with R-Link is open |
| 5 | Move the microphone away from the speakers |

### Issue: Noise Suppression Not Reducing Background Noise

| Step | Action |
|---|---|
| 1 | Verify noise suppression is enabled in Settings |
| 2 | Noise suppression works best for steady-state noise (fans, AC) |
| 3 | It may not fully eliminate loud or sudden noises |
| 4 | Try using a headset with a directional microphone for better results |
| 5 | Consider muting when not speaking in noisy environments |

### Issue: Video Appears Dark or Washed Out

| Step | Action |
|---|---|
| 1 | Enable `autoLightCorrection` for automatic adjustment |
| 2 | Enable `lowLightAdjust` if in a dimly lit room |
| 3 | Manually adjust `exposure` slider to brighten the image |
| 4 | Adjust `contrast` to improve image clarity |
| 5 | Adjust `colorTemperature` if the image looks too blue or too yellow |
| 6 | Improve physical lighting: face a window or add a desk lamp |

### Issue: Screen Share Shows Black Screen

| Step | Action |
|---|---|
| 1 | Some applications (especially DRM-protected content) cannot be screen shared |
| 2 | On macOS, check System Preferences > Privacy > Screen Recording -- the browser must be listed |
| 3 | Try sharing the entire screen instead of a specific window |
| 4 | Try sharing a browser tab instead of a window |
| 5 | Restart the browser and try again |
| 6 | On Windows, disable hardware acceleration in the application being shared |

---

## FAQ

**Q: Do other participants see my touch-up and filters?**
A: Yes. Touch-up appearance, filters, and virtual backgrounds are applied to your video stream before it is sent to other participants. Everyone sees the enhanced version.

**Q: Does noise suppression affect my voice quality?**
A: Mild noise suppression has minimal impact. Aggressive noise suppression may slightly alter voice tone or add minor artifacts. If voice quality is a priority (e.g., podcasting), consider disabling noise suppression and using a high-quality microphone in a quiet environment.

**Q: Can I use an external webcam and a built-in camera simultaneously?**
A: No. Only one camera can be active at a time. Select the desired camera in the device selection dropdown.

**Q: Why does my mirror video look reversed to me but correct to others?**
A: Mirror video only affects your local preview. It makes your video look like a mirror so your movements feel natural. Other participants always see the non-mirrored (correct) orientation.

**Q: Can I take a snapshot of my video settings to reuse later?**
A: Settings persist within the browser session but may reset if cache is cleared. There is no explicit "save settings profile" feature. Custom backgrounds persist in the `customBackgrounds` array.

**Q: Does HD video use more data?**
A: Yes. HD video requires approximately 2-4x more bandwidth than standard definition. If you are on a metered connection, be aware of increased data usage.

**Q: What happens if my internet connection drops during a session?**
A: The `NetworkMonitor` component (in Live Stream mode) tracks connection quality. If the connection drops briefly, the system attempts to reconnect automatically. If the drop is prolonged, other participants see a frozen frame or placeholder until the connection is restored.

**Q: Can I use multiple monitors with screen sharing?**
A: Yes. When you start screen sharing, the browser's share picker shows all connected monitors. Select the specific monitor you want to share.

**Q: Why is my virtual background flickering or showing artifacts?**
A: This is usually caused by poor lighting, complex backgrounds (busy patterns behind you), or insufficient GPU performance. Try improving lighting, using a simpler background, or switching to green screen mode.

---

## Known Limitations

1. **No token-based settings persistence**: Media settings are stored in-session and may reset across browser sessions if cache is cleared.
2. **Single camera only**: Cannot use multiple cameras simultaneously.
3. **Touch-up requires GPU**: The `SkinEnhancementProcessor` requires WebGL and GPU support; not available on all devices.
4. **Virtual backgrounds are CPU/GPU intensive**: May cause performance issues on older hardware.
5. **No audio effects/equalization**: There is no built-in EQ, compression, or audio effects beyond noise suppression.
6. **Noise suppression quality varies**: Effectiveness depends on the type and volume of background noise.
7. **Green screen mode requires physical setup**: The green screen toggle only enables chroma key processing; a physical green screen is required.
8. **Filter list is fixed**: Users cannot create custom filters or import filter presets.
9. **No per-device settings profiles**: Settings apply globally, not per-device. If you switch cameras, you may need to readjust settings.
10. **Screen sharing limited by OS permissions**: macOS and some Windows configurations require explicit screen recording permissions at the OS level.
11. **No picture-in-picture for local preview**: The local preview is only visible within the Studio; it cannot be popped out to a floating window.

---

## Plan Requirements

| Feature | Basic | Business |
|---|---|---|
| Microphone controls (mute, noise suppression, auto-adjust) | Yes | Yes |
| Camera controls (on/off, mirror, HD) | Yes | Yes |
| Virtual backgrounds | Yes | Yes |
| Custom background upload | Yes | Yes |
| Green screen mode | Yes | Yes |
| Touch-up appearance | Yes | Yes |
| Skin enhancement (all sub-settings) | Yes | Yes |
| Light & color adjustments | Yes | Yes |
| Filters | Yes | Yes |
| Screen sharing | Yes | Yes |
| Device selection | Yes | Yes |
| Multi-track recording | No | Yes |
| Cloud recording | No | Yes |
| Local recording | Yes | Yes |
| Live streaming controls | No | Yes |
| Network monitor | No | Yes (Live Stream) |
| Stream health monitor | No | Yes (Live Stream) |

Most media controls are available on both Basic and Business plans. The primary plan-gated features in this category are multi-track recording, cloud recording, and live streaming controls, which require the Business plan.

---

## Related Documents

- [08-studio-interface.md](./08-studio-interface.md) -- Studio layout and component overview
- [07-session-types.md](./07-session-types.md) -- Session types and layout configurations
- [06-rooms-management.md](./06-rooms-management.md) -- Room settings that affect default media configuration
- [05-authentication-and-access.md](./05-authentication-and-access.md) -- Access requirements
- [31-troubleshooting.md](./31-troubleshooting.md) -- General troubleshooting including media device issues
- [02-plans-and-pricing.md](./02-plans-and-pricing.md) -- Plan comparison for feature availability
