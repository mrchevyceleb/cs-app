# 15 - Studio Streaming

## Overview

The R-Link Studio Streaming system enables hosts to broadcast live sessions to one or more external platforms simultaneously. The system provides RTMP-based streaming to YouTube, Facebook, Twitch, LinkedIn, and custom RTMP endpoints, with real-time health monitoring, adaptive bitrate control, network quality analysis, RTMP ingest for external encoders, automated scene switching, active stream management, and viewer tracking. The streaming system is accessed through the **Bottom Controls** bar and the streaming configuration modals in the studio interface.

---

## Accessing Streaming Controls

1. Enter any R-Link Studio session.
2. Locate the **Bottom Controls** bar at the bottom of the studio.
3. Click the **Go Live** or **Stream** button to open the `StreamingConfigModal`.
4. Configure your streaming destinations and click **Start Streaming**.

---

## Supported Platforms

The `StreamingConfigModal` provides tabs for 4 platform categories:

| Platform | Icon | Default RTMP URL | Color |
|----------|------|------------------|-------|
| **YouTube Live** | YouTube | `rtmp://a.rtmp.youtube.com/live2` | `#FF0000` |
| **Facebook Live** | Facebook | `rtmps://live-api-s.facebook.com:443/rtmp/` | `#1877F2` |
| **Twitch** | Twitch | `rtmp://live.twitch.tv/app` | `#9146FF` |
| **Custom RTMP** | Radio | (user-provided) | `#6a1fbf` |

Each platform tab displays:
- Platform icon and name with connection status.
- **Stream URL / Server** input -- pre-filled with default RTMP URL for known platforms; editable for custom RTMP.
- **Stream Key** input -- password-masked by default with show/hide toggle.
- **Copy** button -- copies the stream key to clipboard.
- **External link** -- direct link to the platform's stream dashboard for retrieving the stream key.
- **Start Streaming** / **Add Stream** button -- begins broadcasting to that platform.

---

## RTMP Configuration

### StreamingConfigModal

The `StreamingConfigModal` is the primary interface for configuring RTMP streaming destinations.

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | boolean | Controls modal visibility |
| `onClose` | function | Called when the modal closes |
| `onStartStream` | function | Called with stream config when streaming starts |
| `currentStreams` | array | List of currently active streams |
| `onOpenRTMPIngest` | function | Opens the RTMP Ingest configuration modal |
| `onToggleAutoScene` | function | Toggles automated scene switching |
| `autoSceneEnabled` | boolean | Whether auto scene switching is active |
| `participants` | array | List of session participants for recording controls |
| `onToggleParticipantRecording` | function | Toggles per-participant recording |

#### Stream Configuration Object

When a stream starts, the system sends this configuration:

```
{
  platform: 'youtube' | 'facebook' | 'twitch' | 'rtmp',
  streamUrl: 'rtmp://...',
  streamKey: 'sk_...',
  name: 'YouTube Live'  // Platform display name
}
```

#### Validation

- Both `streamUrl` and `streamKey` are required before streaming can start.
- If either field is empty, an error toast appears: "Please enter both stream URL and stream key."
- Fields are disabled when a stream is already active on that platform.

---

## Multi-Stream Manager

The `MultiStreamManager` component provides a floating panel for managing multiple simultaneous streams.

### Accessing the Multi-Stream Manager

- The panel appears automatically when multiple streams are active.
- Positioned at `top-right` of the studio viewport (`fixed top-20 right-4`).
- Shows the count of active streams in the header.

### Per-Stream Controls (StreamCard)

Each active stream displays as a card with:

#### Status Indicators

| Status | Color | Icon | Description |
|--------|-------|------|-------------|
| `active` | Green | CheckCircle | Stream is live and healthy |
| `connecting` | Yellow | AlertCircle | Stream is establishing connection |
| `error` | Red | AlertCircle | Stream encountered an error |
| `inactive` | Gray | Radio | Stream is configured but not broadcasting |

#### Stream Statistics (Active Streams)

When a stream is active and has stats, a 3-column metric grid displays:

| Metric | Description |
|--------|-------------|
| **Viewers** | Current viewer count |
| **Bitrate** | Current encoding bitrate (kbps) |
| **FPS** | Frames per second |

#### Per-Stream Settings (Expandable)

Click the **gear icon** on a stream card to reveal independent settings:

| Setting | Type | Description |
|---------|------|-------------|
| **Custom Resolution** | Toggle + Select | Override the global resolution. Options: 720p, 1080p, 1440p, 4K |
| **Bitrate** | Slider | Override bitrate (1000-10000 kbps, 500 step) |
| **Independent Audio** | Toggle | Use a separate audio mix for this stream |
| **Different Scene** | Toggle | Send a different scene layout to this stream |

These per-stream overrides allow you to send different quality levels or content to different platforms simultaneously. For example, send 1080p to YouTube and 720p to Twitch.

#### Stream Card Actions

- **Edit Configuration** -- reopen the platform configuration modal.
- **Copy Stream URL** -- copy the RTMP URL to clipboard.
- **Remove Stream** -- disconnect and remove the stream.

---

## Stream Health Monitor

The `StreamHealthMonitor` component provides real-time network quality monitoring during active streams.

### Accessing the Health Monitor

- The monitor appears at the bottom-left of the studio when streaming is active (`fixed bottom-24 left-4`).
- Can be minimized to a floating badge showing the current quality level.
- Can be expanded for detailed metrics.

### Network Quality Levels

| Quality | Color | Criteria | Description |
|---------|-------|----------|-------------|
| `excellent` | Green | Bitrate >= 5000 kbps, Latency <= 50ms, Packet Loss <= 0.5% | Optimal streaming conditions |
| `good` | Blue | Bitrate >= 2500 kbps, Latency <= 100ms, Packet Loss <= 2% | Good streaming conditions |
| `fair` | Yellow | Bitrate >= 1000 kbps, Latency <= 200ms, Packet Loss <= 5% | Acceptable but may have minor issues |
| `poor` | Orange | Bitrate >= 500 kbps, Latency <= 300ms, Packet Loss <= 10% | Poor conditions, quality affected |
| `critical` | Red | Below poor thresholds | Stream may be unstable |

### Live Metrics Dashboard

The health monitor displays 4 real-time metric cards:

| Metric | Unit | Good Trend | Bad Trend |
|--------|------|------------|-----------|
| **Bitrate** | kbps | > 3000 (green up arrow) | < 1500 (red down arrow) |
| **Latency** | ms | < 100 (green up arrow) | > 200 (red down arrow) |
| **Packet Loss** | % | < 2 (green up arrow) | > 5 (red down arrow) |
| **Jitter** | ms | < 20 (green up arrow) | > 40 (red down arrow) |

### Active Alerts

The system generates alerts with cooldown (10 seconds between same alert types):

| Alert Type | Severity | Trigger | Recommended Action |
|-----------|----------|---------|-------------------|
| High Latency | Medium/High | > 200ms (Medium), > 300ms (High) | Reduce stream quality or check network |
| Packet Loss | Medium/High | > 5% (Medium), > 10% (High) | Check network stability |
| Low Bitrate | High | < 1000 kbps | Stream may appear low quality to viewers |
| High Jitter | Medium | > 30ms | Stream may appear choppy to viewers |

Alerts can be individually dismissed or bulk-cleared via "Clear All."

### 10-Second Average Statistics

When the health monitor is expanded (click the expand icon), a "10s Average" section shows smoothed statistics calculated from the last 10 data points, reducing noise from momentary fluctuations.

---

## Network Monitor (Adaptive Bitrate)

The `useNetworkMonitor` hook provides the underlying network monitoring and adaptive bitrate system.

### Monitoring Behavior

- Monitoring starts automatically when streaming begins (`isStreaming = true`).
- Network conditions are sampled every **1 second** (1000ms interval).
- Statistics history retains the last **60 data points** (approximately 1 minute).
- Monitoring stops when streaming ends.

### Adaptive Bitrate Profiles

The system uses 5 quality profiles that automatically adjust based on network conditions:

| Profile | Video Bitrate | Audio Bitrate | Resolution | FPS |
|---------|--------------|---------------|------------|-----|
| `ultra` | 6000 kbps | 192 kbps | 1080p | 60 |
| `high` | 4500 kbps | 128 kbps | 1080p | 30 |
| `medium` | 2500 kbps | 128 kbps | 720p | 30 |
| `low` | 1500 kbps | 96 kbps | 480p | 30 |
| `minimal` | 800 kbps | 64 kbps | 360p | 24 |

### Adaptive Profile Selection Logic

When adaptive mode is enabled, the system automatically selects profiles based on current network quality:

| Network Quality | Available Bandwidth | Selected Profile |
|----------------|--------------------|-----------------|
| `critical` or `poor` | Any | `minimal` |
| `fair` | > 2000 kbps | `low` |
| `fair` | <= 2000 kbps | `minimal` |
| `good` | > 3500 kbps | `medium` |
| `good` | <= 3500 kbps | `low` |
| `excellent` | > 6000 kbps | `ultra` |
| `excellent` | > 4000 kbps | `high` |
| `excellent` | <= 4000 kbps | `medium` |

- The system uses 80% of available bandwidth for encoding (`availableBandwidth * 0.8`).
- Profile changes generate a low-severity info alert: "Stream quality adjusted to [profile] ([resolution])."

### Manual Profile Override

- In the Stream Health Monitor, toggle **Adaptive** off.
- A dropdown appears listing all 5 profiles with their resolutions.
- Select a profile to lock the stream at that quality level.
- The current profile details (resolution, FPS, video/audio bitrate) display in a summary card.

### Network Monitor Return Values

```
{
  networkStats: {
    bitrate: number,        // Current bitrate (kbps)
    latency: number,        // Current latency (ms)
    packetLoss: number,     // Current packet loss (%)
    jitter: number,         // Current jitter (ms)
    quality: string,        // 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
    availableBandwidth: number,  // Estimated available bandwidth (kbps)
    lastUpdate: number      // Timestamp of last measurement
  },
  currentProfile: string,   // Current bitrate profile name
  profileConfig: object,    // Current profile's settings (videoBitrate, audioBitrate, resolution, fps)
  isAdaptive: boolean,      // Whether adaptive mode is enabled
  alerts: array,            // Active alert objects
  statsHistory: array,      // Last 60 data points
  dismissAlert: function,   // Dismiss a specific alert by ID
  clearAllAlerts: function, // Clear all alerts
  getAverageStats: function, // Get averaged stats over N seconds
  setManualProfile: function, // Set a manual profile (disables adaptive)
  enableAdaptive: function  // Re-enable adaptive mode
}
```

---

## RTMP Ingest

The `RTMPIngestModal` allows external encoders (OBS, vMix, Wirecast, etc.) to stream directly into the R-Link session.

### Creating an Ingest Endpoint

1. Open the Streaming Config Modal.
2. Click **Configure RTMP Ingest** at the bottom.
3. Enter a name for the encoder (e.g., "OBS", "vMix").
4. Click **Generate**.
5. The system creates an ingest endpoint with:
   - **Ingest ID:** `ingest-[timestamp]`
   - **RTMP URL:** `rtmp://ingest.yourdomain.com/live`
   - **Stream Key:** Auto-generated (`sk_[random]`)
   - **Status:** `inactive` (becomes `active` when the encoder connects)

### Using the Ingest Endpoint

1. Copy the **Server URL** and **Stream Key** from the ingest endpoint card.
2. Open your encoder software (OBS, vMix, Wirecast, etc.).
3. Paste the Server URL into the encoder's RTMP server field.
4. Paste the Stream Key into the encoder's stream key field.
5. Start streaming from the encoder.
6. The external feed appears as a source in the R-Link session.

### Ingest Management

- **Show/Hide Key:** Toggle visibility of the stream key.
- **Copy to Clipboard:** One-click copy for both URL and key.
- **Regenerate Key:** Generate a new stream key (invalidates the old one).
- **Status indicator:** Green "Live" badge when actively receiving, gray "Inactive" when not.

---

## Automated Scene Switcher

The `AutomatedSceneSwitcher` component enables automatic scene layout changes based on session events.

### Enabling Auto Scene Switching

1. Open the Streaming Config Modal.
2. Click **Enable Auto Scene Switching** at the bottom.
3. The button toggles to "Auto Scene Switching Enabled" with a purple background.

When enabled, the system automatically switches scene layouts based on events such as:
- Number of active participants (switch between solo, dual, and grid layouts).
- Screen sharing start/stop (switch to screen share layout).
- Element activation (adjust layout to accommodate overlays).

---

## Active Streams Panel

The `ActiveStreamsPanel` component displays compact stream status cards when streams are active.

### Display

- Positioned at the bottom-right of the studio (`fixed bottom-20 right-4`).
- Only appears when at least one stream is active.
- Each stream card shows:
  - Platform icon with platform color.
  - Stream name and **LIVE** badge (animated pulse).
  - Time elapsed since stream started (uses `date-fns` `formatDistanceToNow`).
  - **Stop** button (X icon) to end that specific stream.
  - Stream stats grid: Viewers, Quality (resolution), Bitrate (kbps).
  - **View Analytics** button (if analytics callback is provided).

---

## Stream Lifecycle

### Starting a Stream

1. Open the `StreamingConfigModal`.
2. Select a platform tab.
3. Enter the Stream URL and Stream Key.
4. Click **Start Streaming** (or **Add Stream** if other streams are already active).
5. A success toast appears: "Starting stream to [Platform Name]."
6. The stream card appears in the `ActiveStreamsPanel` with `status: 'connecting'`.
7. Once the connection is established, status changes to `active`.

### During a Stream

- The `StreamHealthMonitor` continuously monitors network quality.
- The `NetworkMonitor` adjusts bitrate if adaptive mode is enabled.
- Alerts are generated for network issues.
- Stream statistics (viewers, bitrate, FPS) update in real time.
- All active elements, overlays, and scene layouts are encoded into the stream output.

### Stopping a Stream

1. Click the **X** button on the stream card in the `ActiveStreamsPanel`.
2. Or click the **Stop** button in the stream controls.
3. The stream disconnects from the platform.
4. The stream card is removed from the active streams panel.
5. If all streams stop, the health monitor and active streams panel hide.

---

## Viewer Tracking

The R-Link streaming system tracks viewer engagement during live sessions:

- **Tracking interval:** Viewer counts are polled every **5 seconds** (5000ms).
- **Viewer count:** Displayed on each active stream card and in analytics.
- **Per-platform tracking:** Each streaming destination reports its own viewer count independently.
- **Analytics:** The `LiveAnalyticsDashboard` component provides detailed viewer analytics accessible from the active stream cards.

---

## Local Recording Controls

The Streaming Config Modal also includes **Local Recording Controls** for per-participant high-quality recording:

1. Expand the "Local Recording Controls" section in the streaming modal.
2. A list of all session participants appears with toggle switches.
3. Enable/disable recording for each participant individually.
4. Active recordings show a pulsing red dot next to the participant name.
5. Each participant records as a **separate audio track** for post-production mixing (multi-track recording).
6. Host participants are labeled with a purple "HOST" badge.

---

## Common Troubleshooting

### Q: My stream is not connecting.
**A:** Verify the Stream URL and Stream Key are correct. Check that you copied them from the platform's live streaming dashboard. For YouTube, the URL should be `rtmp://a.rtmp.youtube.com/live2`. For Facebook, use `rtmps://live-api-s.facebook.com:443/rtmp/`. Ensure your network allows outbound RTMP traffic (port 1935 for RTMP, port 443 for RTMPS).

### Q: The stream quality keeps dropping.
**A:** The adaptive bitrate system is adjusting to your network conditions. Check the Stream Health Monitor for current metrics. If latency is high or packet loss is significant, try: (1) switching to a wired ethernet connection, (2) closing bandwidth-heavy applications, (3) manually setting a lower bitrate profile.

### Q: I want to stream to multiple platforms at different qualities.
**A:** Use the per-stream settings in the Multi-Stream Manager. Click the gear icon on each stream card and enable "Custom Resolution" and adjust the bitrate slider independently for each platform.

### Q: How do I use an external encoder like OBS?
**A:** Open the Streaming Config Modal, click "Configure RTMP Ingest," create an ingest endpoint, copy the Server URL and Stream Key, paste them into your encoder's settings, and start streaming from the encoder. The external feed appears as a source in your R-Link session.

### Q: The health monitor shows "critical" quality but my internet seems fine.
**A:** The health monitor measures the specific network path to the RTMP servers, which may differ from general internet speed tests. Try: (1) testing with a different streaming platform, (2) checking if your ISP throttles RTMP traffic, (3) reducing the streaming resolution and bitrate manually.

### Q: Can I stream and record at the same time?
**A:** Yes. Streaming and recording are independent systems. You can stream to external platforms while simultaneously recording locally or to the cloud. See `16-studio-recording.md` for recording details.

### Q: Where can I find my platform stream key?
**A:** Each platform tab in the Streaming Config Modal includes an external link icon that directs you to the platform's dashboard: YouTube Studio (stream settings), Facebook Live Producer, or Twitch Dashboard (stream settings).

### Q: What is Auto Scene Switching?
**A:** When enabled, the system automatically changes the scene layout based on session events (participant count changes, screen sharing, etc.). This reduces manual layout management during broadcasts. Toggle it on via the Streaming Config Modal.

---

## API Reference

### Stream Object

```
{
  id: string,              // Unique stream identifier
  platform: string,        // 'youtube' | 'facebook' | 'twitch' | 'rtmp'
  name: string,            // Platform display name
  streamUrl: string,       // RTMP URL
  streamKey: string,       // Stream key (sensitive)
  status: string,          // 'active' | 'connecting' | 'error' | 'inactive'
  startedAt: datetime,     // When the stream started
  stats: {
    viewers: number,       // Current viewer count
    bitrate: number,       // Current bitrate (kbps)
    fps: number,           // Frames per second
    quality: string        // Resolution label (e.g., '1080p')
  },
  config: {
    customResolution: boolean,
    resolution: string,    // '720p' | '1080p' | '1440p' | '4k'
    bitrate: number,       // Override bitrate (kbps)
    independentAudio: boolean,
    differentScene: boolean
  }
}
```

### RTMP Ingest Object

```
{
  id: string,              // 'ingest-[timestamp]'
  name: string,            // Encoder name (e.g., 'OBS')
  rtmpUrl: string,         // 'rtmp://ingest.yourdomain.com/live'
  streamKey: string,       // Auto-generated 'sk_[random]'
  status: string,          // 'active' | 'inactive'
  createdAt: datetime      // Creation timestamp
}
```

---

## Related Features

- **Recording:** Recording can run independently of streaming. See `16-studio-recording.md`.
- **Overlays and Scenes:** Active overlays and scene layouts are encoded in the stream output. See `14-studio-overlays-scenes.md`.
- **Elements:** Active elements appear in the stream. See `10-studio-elements.md`.
- **Chat:** Live chat messages can be overlaid on the stream. See `13-studio-chat.md`.
- **Scheduling:** Live streams can be scheduled in advance. See `22-scheduling.md`.
