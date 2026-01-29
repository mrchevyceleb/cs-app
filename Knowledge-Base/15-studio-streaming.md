# Studio Streaming System

## Overview

The R-Link Studio Streaming system enables hosts to broadcast their sessions live to external platforms such as YouTube, Facebook, Twitch, and LinkedIn simultaneously. Built around RTMP (Real-Time Messaging Protocol), the streaming system supports multi-destination streaming through `MultiStreamManager`, stream health monitoring via `StreamHealthMonitor`, adaptive bitrate with `NetworkMonitor`, automated scene switching through `AutomatedSceneSwitcher`, and RTMP ingest for bringing external sources into R-Link. The streaming system is most commonly used in Live Stream session types but is available for Webinars as well. It includes real-time viewer tracking, stream quality metrics, and celebration overlays for audience milestones.

## RTMP Configuration

### StreamingConfigModal
The `StreamingConfigModal` is the primary interface for configuring outbound streams. Hosts use this modal to set up streaming destinations before going live.

### Setting Up a Stream Destination
1. Open the **Streaming** panel in the Studio
2. Click **"Add Stream Destination"** or open the `StreamingConfigModal`
3. Select a platform or choose "Custom RTMP":
   - **YouTube Live** -- Enter your YouTube stream key
   - **Facebook Live** -- Enter your Facebook stream URL and key
   - **Twitch** -- Enter your Twitch stream key
   - **LinkedIn Live** -- Enter your LinkedIn stream URL and key
   - **Custom RTMP** -- Enter any RTMP server URL and stream key
4. Provide the following configuration:
   - **Platform:** The target streaming platform
   - **Name:** A friendly name for this stream destination (e.g., "Main YouTube Channel")
   - **Stream URL:** The RTMP ingest URL for the platform
   - **Stream Key:** The unique key provided by the platform to authenticate the stream
5. Save the configuration
6. The destination appears in the `ActiveStreamsPanel`

### Stream Configuration Properties

| Property | Description | Example |
|----------|-------------|---------|
| `platform` | Target streaming platform | `youtube`, `facebook`, `twitch`, `linkedin`, `custom` |
| `name` | Display name for the destination | "YouTube Main Channel" |
| `streamUrl` | RTMP ingest server URL | `rtmp://a.rtmp.youtube.com/live2` |
| `streamKey` | Authentication key for the platform | Platform-provided key |

## Multi-Stream (MultiStreamManager)

### Overview
The `MultiStreamManager` component handles simultaneous streaming to multiple destinations. Hosts can broadcast to YouTube, Facebook, Twitch, LinkedIn, and custom RTMP endpoints at the same time from a single R-Link session.

### Setting Up Multi-Stream
1. Configure multiple stream destinations using the `StreamingConfigModal` (repeat the setup for each platform)
2. Each destination appears as a separate entry in the `ActiveStreamsPanel`
3. When starting the stream, all configured destinations begin receiving the broadcast simultaneously
4. Each destination is independently monitored for quality and connectivity

### Managing Active Streams
The `ActiveStreamsPanel` displays all active and configured streams with:
- Stream name and platform icon
- Live/offline status indicator
- Viewer count per platform
- Stream quality metrics (bitrate, resolution)
- Individual stream controls (start, stop per destination)

## Starting and Stopping Streams

### Starting a Stream
1. Ensure at least one stream destination is configured
2. Click the **"Go Live"** button in the streaming panel
3. The system initiates the stream:
   - Creates a stream record with the configured `platform`, `name`, `streamUrl`, and `streamKey`
   - Begins encoding and transmitting the video/audio feed
   - Starts tracking `viewers`, `quality`, and `bitrate` metrics
4. The `ActiveStreamsPanel` updates to show the stream as live
5. Viewer count tracking begins (simulated viewer count updates every 5 seconds)

### Stopping a Stream
1. Click the **"Stop Stream"** button for a specific destination or "Stop All" for all destinations
2. The system performs cleanup:
   - Clears monitoring intervals and timers
   - Disconnects from the RTMP ingest server
   - Finalizes viewer and quality statistics
3. When the **last active stream** is stopped:
   - The `isLive` state is set to `false`
   - The session transitions out of live mode
   - All streaming-related overlays and indicators are cleared

### Stream Lifecycle
```
Configure Destinations --> Go Live --> Streaming (monitoring active) --> Stop Stream --> Cleanup
                                         |                                    |
                                         +-- Viewer tracking every 5s         +-- isLive = false (if last stream)
                                         +-- Quality monitoring               +-- Clear intervals
                                         +-- Health checks                    +-- Finalize stats
```

## Stream Health Monitoring

### StreamHealthMonitor
The `StreamHealthMonitor` component continuously monitors the health of active streams and alerts hosts to issues that could affect viewer experience.

### Monitored Metrics
| Metric | Description | Warning Threshold |
|--------|-------------|-------------------|
| Bitrate | Current encoding bitrate | Below target bitrate |
| Frame rate | Frames per second being encoded | Below target FPS |
| Dropped frames | Frames lost during encoding/transmission | Above acceptable rate |
| Connection stability | Network connection to RTMP server | Unstable or reconnecting |
| Latency | Delay between capture and delivery | Above acceptable threshold |
| Buffer health | Encoder buffer status | Buffer underrun or overflow |

### Health Alerts
- **Green:** Stream is healthy, all metrics within acceptable range
- **Yellow/Warning:** One or more metrics approaching threshold; stream may degrade
- **Red/Critical:** Stream quality is significantly degraded; immediate attention needed
- Host receives visual alerts and notifications when stream health changes

## Network Monitoring and Adaptive Bitrate

### NetworkMonitor Hook
The `NetworkMonitor` hook provides real-time network analysis and adaptive bitrate capabilities:

| Property | Type | Description |
|----------|------|-------------|
| `networkStats` | Object | Current network statistics (upload speed, latency, packet loss) |
| `currentProfile` | String | Active quality profile name |
| `profileConfig` | Object | Configuration for the current quality profile |
| `isAdaptive` | Boolean | Whether adaptive bitrate is enabled |
| `alerts` | Array | Active network alerts and warnings |
| `statsHistory` | Array | Historical network statistics for trend analysis |

### Adaptive Bitrate
- When `isAdaptive` is `true`, the system automatically adjusts encoding bitrate based on network conditions
- If upload bandwidth drops, the encoder reduces bitrate to prevent buffering and dropped frames
- If bandwidth improves, the encoder increases bitrate to improve stream quality
- The `currentProfile` switches between quality presets (e.g., "High", "Medium", "Low") based on conditions
- `statsHistory` allows the system to detect trends rather than reacting to momentary fluctuations

### Network Alerts
The `alerts` array contains active network warnings:
- Low upload bandwidth detected
- High packet loss rate
- Increased latency to streaming servers
- Network instability (frequent speed fluctuations)

## Automated Scene Switching

### AutomatedSceneSwitcher
The `AutomatedSceneSwitcher` component enables automatic transitions between scenes based on predefined rules or triggers.

### Configuration
- **`autoSceneSwitchEnabled` state:** Toggle to enable or disable automated scene switching
- When enabled, the system can automatically switch between scenes based on:
  - Time intervals (rotate scenes every N seconds/minutes)
  - Audio activity (switch to the speaker's scene when they talk)
  - Events (switch to a specific scene when a new chat message arrives, when a poll starts, etc.)
  - Custom triggers defined by the host

### Using Automated Scene Switching
1. Navigate to the scene switching settings in the Studio
2. Toggle `autoSceneSwitchEnabled` to **on**
3. Configure switching rules:
   - Select trigger conditions
   - Map triggers to specific scenes
   - Set transition timing and effects
4. The system automatically switches scenes during the live session based on your rules
5. Manual scene switching remains available and overrides automated switching temporarily

## RTMP Ingest

### RTMPIngestModal
The `RTMPIngestModal` allows hosts to bring external video sources into R-Link using RTMP ingest. This is the reverse of outbound streaming -- instead of pushing video out, external software (like OBS or vMix) pushes video into R-Link.

### Setting Up RTMP Ingest
1. Open the `RTMPIngestModal` from the streaming panel
2. R-Link generates a unique RTMP ingest URL and stream key
3. Copy the ingest URL and stream key
4. In your external software (OBS, vMix, Wirecast, etc.):
   - Set the streaming destination to the R-Link ingest URL
   - Enter the stream key
   - Start streaming from the external software
5. The external source appears as an available video input in R-Link
6. Add the ingested source to your stage or scene layout

### Use Cases for RTMP Ingest
- Bringing in a remote presenter using their own production setup
- Incorporating feeds from hardware encoders or cameras
- Using professional switching software (vMix, Wirecast) as a source
- Combining multiple production environments into a single R-Link session

## Viewer Tracking

### Real-Time Viewer Count
- The system tracks the number of concurrent viewers across all streaming platforms
- Viewer count updates are simulated/refreshed every **5 seconds**
- Viewer counts are displayed in the `ActiveStreamsPanel` per destination
- A combined total viewer count is also available

### Viewer Metrics Tracked
| Metric | Description |
|--------|-------------|
| `viewers` | Current concurrent viewer count |
| `quality` | Stream quality indicator per platform |
| `bitrate` | Current bitrate being delivered |
| Peak viewers | Maximum concurrent viewers during the stream |
| Total unique viewers | Cumulative unique viewers (may be available post-session) |

## CelebrationOverlay

### Overview
The `CelebrationOverlay` component displays visual celebrations and animations on the stream when milestone events occur.

### Triggering Events
- Viewer count milestones (e.g., 100 viewers, 1,000 viewers)
- Subscription or follow events
- Donation or purchase notifications
- Custom celebration triggers set by the host
- Auction bids or other interactive element events

### Behavior
- When a celebration event occurs, an animated overlay appears on the live stage
- The overlay is visible to both in-session participants and external stream viewers
- Celebrations auto-dismiss after a set duration
- Multiple celebration types may have different visual styles (confetti, fireworks, banners, etc.)

## Streaming Components Reference

| Component | Purpose |
|-----------|---------|
| `StreamingConfigModal` | Configure RTMP stream destinations |
| `ActiveStreamsPanel` | Display and manage active streams |
| `MultiStreamManager` | Handle multi-destination streaming |
| `RTMPIngestModal` | Set up RTMP ingest from external sources |
| `StreamHealthMonitor` | Monitor stream health metrics |
| `AutomatedSceneSwitcher` | Automate scene transitions |
| `NetworkMonitor` (hook) | Network statistics and adaptive bitrate |
| `CelebrationOverlay` | Display milestone celebrations on stream |
| `StreamOverlayRenderer` | Render overlays on the stream output |

## Settings and Options

| Setting | Description | Default |
|---------|-------------|---------|
| Stream destinations | Configured RTMP endpoints | None (must configure) |
| Adaptive bitrate | Auto-adjust quality based on network | Enabled |
| Auto scene switch | Enable automated scene transitions | Disabled (`autoSceneSwitchEnabled: false`) |
| Viewer count refresh | How often viewer count updates | Every 5 seconds |
| Stream quality profile | Encoding quality preset | Based on network conditions |
| RTMP ingest | Accept external RTMP sources | Disabled until configured |
| Celebration overlay | Show celebrations for milestones | Enabled |
| Health monitoring | Stream health alert thresholds | Default thresholds |

## Troubleshooting

### Stream fails to start
1. Verify the stream URL and stream key are correct for your platform
2. Check that the platform (YouTube, Facebook, etc.) has streaming enabled on your account
3. Test your network upload speed -- minimum 5 Mbps recommended for stable streaming
4. Ensure no firewall or VPN is blocking RTMP traffic (port 1935)
5. Try a custom RTMP URL to isolate whether the issue is platform-specific

### Stream drops or disconnects frequently
1. Check `NetworkMonitor` alerts for bandwidth or stability issues
2. Enable adaptive bitrate if not already on (`isAdaptive: true`)
3. Lower the stream quality profile to reduce bandwidth requirements
4. Use a wired Ethernet connection instead of WiFi
5. Close other bandwidth-consuming applications
6. Check `StreamHealthMonitor` for specific degradation patterns

### Viewer count seems incorrect
1. Viewer counts update every 5 seconds and may have a brief delay
2. Different platforms report viewer counts at different intervals
3. Viewer counts from external platforms (YouTube, Facebook) may lag behind real-time
4. The simulated count updates may not perfectly reflect actual platform-reported numbers

### RTMP ingest source not appearing
1. Verify the external software is streaming to the correct R-Link ingest URL
2. Check that the stream key matches exactly (no trailing spaces)
3. Ensure the external source is actively sending data (check OBS/vMix status)
4. Verify network connectivity between the external source and R-Link servers
5. Check if the RTMP ingest session has timed out and needs to be restarted

### Multi-stream: one destination fails while others work
1. This typically indicates a platform-specific issue (wrong key, platform outage)
2. Check the individual stream health in `ActiveStreamsPanel`
3. Stop and restart the failing destination without affecting others
4. Verify the failing platform's stream key hasn't expired or been rotated

### Automated scene switching not working
1. Confirm `autoSceneSwitchEnabled` is set to `true`
2. Verify at least two scenes are configured with switching rules
3. Check that the trigger conditions are being met (e.g., audio detected, timer elapsed)
4. Manual scene switches may temporarily override automation -- wait for the next automated trigger

### Network alerts appearing constantly
1. Review `statsHistory` to identify if the issue is temporary or persistent
2. Check your internet connection quality with an external speed test
3. Lower stream quality if upload bandwidth is insufficient
4. Consider using a dedicated streaming network connection
5. If using WiFi, switch to a 5GHz band or wired connection

## FAQ

**Q: How many platforms can I stream to simultaneously?**
A: The `MultiStreamManager` supports streaming to multiple destinations at once. The practical limit depends on your plan and available upload bandwidth, as each destination requires additional bandwidth.

**Q: Can I start and stop individual streams independently?**
A: Yes. Each stream destination in the `ActiveStreamsPanel` has independent start/stop controls. You can start streaming to YouTube first, add Facebook mid-stream, and stop Twitch independently.

**Q: What happens when I stop the last active stream?**
A: When the last stream is stopped, the system sets `isLive` to `false`, clears all monitoring intervals, and the session exits live mode. Overlays and streaming indicators are cleared.

**Q: What is adaptive bitrate and should I enable it?**
A: Adaptive bitrate automatically adjusts your stream's encoding quality based on your network conditions. It reduces bitrate when your connection degrades and increases it when conditions improve. It is recommended to keep this enabled for the most reliable streaming experience.

**Q: Can I use OBS or vMix with R-Link?**
A: Yes, through RTMP ingest. R-Link provides an RTMP ingest URL and stream key that you can use in OBS, vMix, Wirecast, or any software that supports RTMP output. The external source then appears as a video input within R-Link.

**Q: How often does the viewer count update?**
A: Viewer count updates are refreshed every 5 seconds. This includes simulated count updates within R-Link and periodic syncs with external platform viewer counts.

**Q: What triggers the CelebrationOverlay?**
A: Celebrations are triggered by milestone events such as reaching viewer count thresholds, receiving donations, purchases via the checkout element, auction bids, and custom triggers defined by the host.

**Q: Does automated scene switching work during multi-stream?**
A: Yes. Scene switching operates on the Studio output, which is shared across all streaming destinations. A scene change affects all active streams simultaneously.

**Q: What is the minimum bandwidth needed for streaming?**
A: A minimum of 5 Mbps upload is recommended for a single stream at standard quality. Each additional stream destination requires additional bandwidth. For high-quality multi-stream, 15-20 Mbps or more is recommended.

## Known Limitations

- Viewer count tracking includes simulated updates and may not perfectly reflect actual platform-reported counts in real time
- Adaptive bitrate reacts to network conditions but cannot compensate for severely degraded connections (below minimum usable bandwidth)
- RTMP ingest requires the external source to maintain a stable connection; R-Link cannot reconnect on the external side
- Automated scene switching rules are limited to predefined trigger types; fully custom scripting is not supported
- The `CelebrationOverlay` has a fixed set of animation styles; custom celebration animations are not currently supported
- Stream health metrics are approximate and may differ from platform-reported analytics
- Each streaming destination adds encoding overhead; very high destination counts may impact overall performance
- LinkedIn Live streaming requires LinkedIn approval for live broadcasting on your LinkedIn account
- Stream keys from platforms may expire or rotate, requiring reconfiguration in `StreamingConfigModal`
- The 5-second viewer count refresh interval is fixed and cannot be configured

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Stream to one destination | Yes | Yes |
| Multi-stream (multiple destinations) | No | Yes |
| Stream health monitoring | Basic | Full |
| Network monitoring (adaptive bitrate) | Yes | Yes |
| Automated scene switching | No | Yes |
| RTMP ingest | No | Yes |
| Viewer tracking | Basic | Full (with analytics) |
| CelebrationOverlay | Yes | Yes |
| Stream recording | Local only | Local + Cloud |
| Custom RTMP destinations | Yes | Yes |
| Post-stream analytics | Limited | Full |

## Related Documents

- [00-index.md](00-index.md) -- Knowledge base index
- [14-studio-overlays-scenes.md](14-studio-overlays-scenes.md) -- Overlays and scenes for live streaming
- [16-studio-recording.md](16-studio-recording.md) -- Recording during streams
- [10-studio-elements.md](10-studio-elements.md) -- Elements displayed during streams
- [13-studio-chat.md](13-studio-chat.md) -- Chat system (featured comments on stream)
- [12-studio-polls-qa.md](12-studio-polls-qa.md) -- Polls and Q&A on stream
