# Studio Recording System

## Overview

The R-Link Studio Recording system allows hosts to capture their sessions for later review, editing, and distribution. The system supports two recording modes -- local recording (saved directly to the host's device) and cloud recording (uploaded to R-Link's cloud storage). A key feature is the `MultiTrackRecorder`, which captures separate audio and video tracks for each participant, enabling professional post-production editing. Recording is available across all session types (Meeting, Webinar, Live Stream) and operates independently of the streaming system, meaning hosts can record without being live and vice versa.

## Recording Modes

### Local Recording
- **`recordingMode: 'local'`**
- Recording is captured and saved directly to the host's local device
- Uses the browser's `MediaRecorder` API via the `localRecorder` instance
- Audio and video data is collected in `recordedChunks` as the recording progresses
- When recording stops, the chunks are assembled into a downloadable file
- No upload bandwidth is required; recording happens entirely on the client side

### Cloud Recording
- **`recordingMode: 'cloud'`**
- Recording is captured and uploaded to R-Link's cloud storage in real-time or upon completion
- Recordings are accessible from the R-Link dashboard after the session ends
- Requires sufficient upload bandwidth alongside any active streams
- Cloud recordings may include additional processing (transcription, highlights, etc.)

### Choosing a Recording Mode
1. Before starting a recording, open the recording settings panel
2. Select the recording mode:
   - **Local** for maximum reliability and no bandwidth impact
   - **Cloud** for automatic storage, sharing, and post-processing features
3. The selected mode is stored in the `recordingMode` state

## Starting and Stopping a Recording

### Starting a Recording
1. Click the **"Record"** button in the Studio toolbar or recording panel
2. The `isRecording` state is set to `true`
3. Based on the `recordingMode`:
   - **Local:** The `localRecorder` (a `MediaRecorder` instance) begins capturing media; `recordedChunks` starts accumulating data
   - **Cloud:** The recording stream is initiated and data is sent to cloud storage
4. If `multiTrackEnabled` is `true` (default), the `MultiTrackRecorder` is activated to capture individual tracks
5. The recording indicator appears in the Studio UI (typically a red dot or "REC" badge)
6. The `MultiTrackStatus` component updates to show active recording tracks

### Stopping a Recording
1. Click the **"Stop Recording"** button
2. The `isRecording` state is set to `false`
3. Based on the `recordingMode`:
   - **Local:** The `localRecorder` stops capturing; `recordedChunks` are finalized and assembled into a downloadable file; the browser prompts the user to save or the file is automatically saved to the downloads folder
   - **Cloud:** The recording stream is finalized; the recording is processed and made available in the R-Link dashboard
4. The `MultiTrackRecorder` stops all track captures
5. The recording indicator is removed from the UI

### Recording State Properties

| Property | Type | Description |
|----------|------|-------------|
| `isRecording` | Boolean | Whether a recording is currently active |
| `recordingMode` | String | `'local'` or `'cloud'` |
| `localRecorder` | MediaRecorder | Browser MediaRecorder instance for local recording |
| `recordedChunks` | Array | Accumulated media data chunks during local recording |
| `multiTrackEnabled` | Boolean | Whether multi-track recording is active (default: `true`) |
| `multiTrackStatus` | Object | Current status of multi-track recording |

## MultiTrackRecorder

### Overview
The `MultiTrackRecorder` class provides professional-grade recording by capturing separate audio and video tracks for each participant in the session. This enables post-production workflows where individual tracks can be independently edited, mixed, and processed.

### How It Works
1. When recording starts with `multiTrackEnabled: true`, the `MultiTrackRecorder` initializes
2. It creates individual recording tracks for each participant's audio and video streams
3. Each track is captured independently and synchronized by timestamps
4. When recording stops, all tracks are finalized and available for download or cloud processing

### Multi-Track Status
The `multiTrackStatus` object provides real-time information about the multi-track recording:

```
multiTrackStatus: {
  isRecording: true/false,       // Whether multi-track recording is active
  tracks: [                       // Array of individual track statuses
    {
      participantId: "user_123",
      trackType: "audio",         // "audio" or "video"
      status: "recording",        // "recording", "paused", "stopped"
      duration: 1234,             // Duration in milliseconds
      size: 5678900               // Approximate data size in bytes
    },
    // ... additional tracks
  ]
}
```

### MultiTrackStatus Component
The `MultiTrackStatus` component provides a visual display of the current multi-track recording status:
- Shows each track being recorded with participant name and track type
- Displays recording duration per track
- Indicates track health (recording, paused, error)
- Shows approximate file size per track
- Visible to hosts in the recording panel during an active recording

### Multi-Track Recording Benefits
- **Individual audio control:** Adjust volume levels for each participant in post-production
- **Noise removal:** Remove background noise from one participant without affecting others
- **Flexible editing:** Cut or rearrange individual participant contributions independently
- **Professional output:** Create polished recordings with proper audio mixing and video compositing

## Local Recording Details

### MediaRecorder and Recorded Chunks
- The `localRecorder` is an instance of the browser's native `MediaRecorder` API
- As recording progresses, the `MediaRecorder` fires `dataavailable` events
- Each event provides a chunk of recorded data (a `Blob`)
- These chunks are accumulated in the `recordedChunks` array
- When recording stops, all chunks are concatenated into a single file

### Local Recording Workflow
```
Start Recording --> localRecorder.start() --> dataavailable events --> recordedChunks[] accumulates
                                                                            |
Stop Recording  --> localRecorder.stop()  --> Final chunk added --> Assemble file --> Download prompt
```

### File Output
- Local recordings are typically saved in WebM format (browser-dependent)
- The assembled file is offered as a browser download
- File size depends on recording duration, resolution, and number of participants
- Multi-track recordings produce multiple files (one per track)

## Cloud Recording Details

### Cloud Recording Workflow
```
Start Recording --> Stream data to cloud --> Cloud processes in real-time or on completion
                                                    |
Stop Recording  --> Finalize upload --> Cloud processing --> Available in dashboard
```

### Cloud Recording Features
- Automatic storage without manual file management
- Accessible from any device via the R-Link dashboard
- May include post-processing: transcription, thumbnail generation, highlight extraction
- Shareable via link or embedded player
- Stored securely with access controls based on account permissions

## Settings and Options

| Setting | Description | Default | Options |
|---------|-------------|---------|---------|
| `recordingMode` | Where the recording is saved | `'local'` | `'local'`, `'cloud'` |
| `multiTrackEnabled` | Capture individual participant tracks | `true` | `true`, `false` |
| `isRecording` | Current recording state | `false` | `true`, `false` |
| Recording format | Output file format (local) | WebM (browser-dependent) | Browser-determined |
| Recording quality | Encoding quality/bitrate | Auto-determined | May vary by plan |

## Recording with Streaming

### Independent Operation
- Recording and streaming are independent systems -- you can record without streaming and stream without recording
- When both are active simultaneously, the recording captures the same stage output as the stream
- Local recording does not consume additional upload bandwidth
- Cloud recording alongside multi-stream requires sufficient bandwidth for both

### Recommended Configurations
| Scenario | Recording Mode | Multi-Track | Notes |
|----------|---------------|-------------|-------|
| Meeting (internal) | Local | Enabled | No bandwidth concerns |
| Webinar (large audience) | Cloud | Enabled | Cloud for easy sharing |
| Live Stream + Recording | Local | Enabled | Preserve bandwidth for streams |
| Post-production workflow | Local | Enabled | Multi-track for editing |
| Quick archive | Cloud | Disabled | Simple single-file recording |

## Troubleshooting

### Recording fails to start
1. **Browser permissions:** Ensure the browser has permission to access the microphone and camera
2. **MediaRecorder support:** Verify your browser supports the `MediaRecorder` API (Chrome, Firefox, Edge recommended)
3. **Disk space (local):** Ensure sufficient disk space for local recording
4. **Network (cloud):** Verify internet connection for cloud recording upload
5. **Concurrent limits:** Check if your plan has a limit on simultaneous recording and streaming

### Recording file is empty or corrupted
1. Ensure the recording ran for more than a few seconds -- very short recordings may not produce valid files
2. Check that `recordedChunks` accumulated data during the recording (if local)
3. Verify no browser crash or tab closure interrupted the recording
4. Try a different browser if the issue persists
5. For cloud recordings, check the R-Link dashboard for processing status -- the file may still be processing

### Multi-track recording shows missing tracks
1. Verify all participants had active audio/video when the recording started
2. Participants who join after recording starts may not have tracks captured from the beginning
3. Check `multiTrackStatus.tracks` to see which tracks are active
4. If a participant's camera or microphone was off, their track will not contain data for that period
5. Ensure `multiTrackEnabled` was `true` when the recording started

### Local recording file too large
1. Multi-track recording produces larger files than single-track
2. Consider disabling `multiTrackEnabled` if post-production editing is not needed
3. Lower the recording quality if available in settings
4. Record shorter segments and combine them in post-production
5. Use cloud recording to avoid local storage concerns

### Cloud recording not appearing in dashboard
1. Cloud recordings require processing time after the session ends -- allow several minutes
2. Check your internet connection during the session -- interrupted uploads may fail
3. Verify your plan includes cloud recording
4. Check the session's recording status in the dashboard for any error messages
5. Contact support if the recording does not appear within 30 minutes of session end

### Recording indicator visible but no data captured
1. The `isRecording` state may be `true` but the actual `MediaRecorder` may have failed to initialize
2. Refresh the Studio page and restart the recording
3. Check browser console for MediaRecorder errors
4. Ensure no other application has exclusive access to the camera/microphone

## FAQ

**Q: What is the difference between local and cloud recording?**
A: Local recording saves the file directly to your computer using the browser's MediaRecorder API. Cloud recording uploads the data to R-Link's servers, where it is stored, processed, and made available in your dashboard. Local recording has no bandwidth impact; cloud recording requires upload bandwidth.

**Q: What is multi-track recording?**
A: Multi-track recording captures separate audio and video tracks for each participant, rather than a single mixed output. This enables post-production editing where you can independently adjust each participant's audio volume, remove noise, or edit their video. It is enabled by default (`multiTrackEnabled: true`).

**Q: Can I record and stream at the same time?**
A: Yes. Recording and streaming are independent. You can have a local recording running while streaming to multiple destinations. Cloud recording alongside streaming will require additional upload bandwidth.

**Q: What format are local recordings saved in?**
A: Local recordings are typically saved in WebM format, though the exact format depends on the browser being used. Multi-track recordings produce separate files for each track.

**Q: How long can a recording be?**
A: There is no hard time limit on recordings, but local recordings are limited by available disk space and browser memory. Cloud recordings may have duration limits based on your plan tier.

**Q: Can attendees start recordings?**
A: No. Recording controls are available only to hosts and co-hosts. Attendees do not have access to the recording interface.

**Q: Where are cloud recordings stored?**
A: Cloud recordings are stored on R-Link's secure cloud infrastructure and accessible from your R-Link dashboard. They are associated with the session and can be shared, downloaded, or embedded.

**Q: What happens if my browser crashes during a local recording?**
A: If the browser crashes, any `recordedChunks` not yet assembled into a file will be lost. For critical recordings, cloud recording provides better reliability as data is continuously uploaded. Some browsers may support partial recovery of MediaRecorder data.

**Q: Can I switch between local and cloud recording mid-session?**
A: The `recordingMode` should be set before starting the recording. Switching modes requires stopping the current recording and starting a new one with the desired mode.

**Q: Does multi-track recording work with all session types?**
A: Yes. Multi-track recording works in Meeting, Webinar, and Live Stream session types, capturing individual tracks for all participants with active audio/video.

## Known Limitations

- Local recording format is browser-dependent (typically WebM); direct MP4 output is not guaranteed
- Multi-track recording increases file sizes significantly compared to single-track recording
- The `localRecorder` relies on the browser's `MediaRecorder` API, which has varying levels of support and codec options across browsers
- Cloud recording requires a stable internet connection throughout the session; interruptions may cause data loss
- Participants joining mid-recording may have incomplete tracks (no data from before they joined)
- Very long recordings (multiple hours) may encounter browser memory limits with local recording
- Multi-track recordings produce separate files that must be synchronized in post-production software
- Recording quality options may be limited compared to dedicated recording software
- The `recordedChunks` array is held in browser memory; extremely long recordings may consume significant RAM
- Cloud recording processing time varies based on recording length and server load
- There is no built-in editing interface within R-Link; post-production requires external software

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Local recording | Yes | Yes |
| Cloud recording | No | Yes |
| Multi-track recording | No | Yes |
| MultiTrackStatus display | No | Yes |
| Recording during streaming | Yes (local only) | Yes (local + cloud) |
| Post-session cloud access | No | Yes |
| Recording download | Local file only | Local + Cloud download |
| Transcription of recordings | No | Yes (cloud recordings) |
| Maximum recording duration | Plan-dependent | Extended limits |

## Related Documents

- [00-index.md](00-index.md) -- Knowledge base index
- [15-studio-streaming.md](15-studio-streaming.md) -- Streaming system (recording alongside streaming)
- [14-studio-overlays-scenes.md](14-studio-overlays-scenes.md) -- Overlays and scenes (captured in recordings)
- [10-studio-elements.md](10-studio-elements.md) -- Studio elements (visible in recordings)
- [13-studio-chat.md](13-studio-chat.md) -- Chat system (chat overlay in recordings)
