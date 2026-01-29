# 16 - Studio Recording

## Overview

The R-Link Studio Recording system enables hosts to capture their live sessions as high-quality video and audio files. The system supports two recording modes: **local recording** (captured directly in the browser and downloaded to the host's device) and **cloud recording** (automatically uploaded to a cloud storage provider). Additionally, R-Link provides **multi-track recording** that captures each participant's audio on a separate track for professional post-production mixing. Recording controls are accessible from the studio bottom controls and the streaming configuration modal.

---

## Accessing Recording Controls

1. Enter any R-Link Studio session.
2. Locate the **Bottom Controls** bar at the bottom of the studio.
3. Click the **Record** button to start/stop recording.
4. For advanced recording options:
   - Open the **Streaming Config Modal** and expand the "Local Recording Controls" section.
   - Access **Cloud Storage Settings** from the recording settings panel.

---

## Recording Modes

### Local Recording (`recordingMode: 'local'`)

Local recording captures the studio canvas output directly in the browser using the `MediaRecorder` API.

#### VideoRecorder Component

The `VideoRecorder` component handles local video recording with these features:

| Feature | Description |
|---------|-------------|
| **Quality presets** | Low (1 Mbps), Medium (2.5 Mbps), High (5 Mbps), Ultra (10 Mbps) |
| **Format options** | WebM (`video/webm;codecs=vp9`) or MP4 (`video/mp4`) |
| **Frame rate** | 30 FPS (captured from the studio canvas) |
| **Timer display** | Real-time recording duration counter (MM:SS format) |
| **Download** | One-click download of the recorded file |

#### Local Recording Workflow

1. The `VideoRecorder` receives a `canvasRef` pointing to the studio's video canvas element.
2. Click **Start Recording** to begin:
   - The canvas stream is captured at 30 FPS via `canvas.captureStream(30)`.
   - A `MediaRecorder` instance is created with the selected quality and format settings.
   - Data is collected every 100ms via `ondataavailable` events.
   - A recording timer starts, counting elapsed seconds.
   - A red pulsing dot indicates active recording.
3. Click **Stop Recording** to end:
   - The `MediaRecorder` stops and collects remaining data chunks.
   - The timer stops.
   - A "Recording ready" message appears with the total duration.
4. Click **Download** to save:
   - The recorded chunks are combined into a `Blob`.
   - The file downloads as `recording-[timestamp].webm` or `recording-[timestamp].mp4`.
   - After download, the recording buffer is cleared.

#### Quality Settings

| Quality | Bits Per Second | File Size Estimate (1 hour) |
|---------|----------------|----------------------------|
| Low | 1,000,000 (1 Mbps) | ~450 MB |
| Medium | 2,500,000 (2.5 Mbps) | ~1.1 GB |
| High | 5,000,000 (5 Mbps) | ~2.2 GB |
| Ultra | 10,000,000 (10 Mbps) | ~4.5 GB |

#### Format Support

| Format | MIME Type | Browser Support | Notes |
|--------|-----------|-----------------|-------|
| WebM | `video/webm;codecs=vp9` | Chrome, Firefox, Edge | Default, best compatibility |
| MP4 | `video/mp4` | Limited browser support | Falls back to WebM if unsupported |

The system checks `MediaRecorder.isTypeSupported(mimeType)` before using the selected format. If the chosen format is not supported, it falls back to `video/webm`.

### Cloud Recording (`recordingMode: 'cloud'`)

Cloud recording automatically uploads the finished recording to a configured cloud storage provider.

#### CloudStorageSettings Component

The `CloudStorageSettings` component manages cloud recording configuration:

##### Storage Providers

| Provider | ID | Default | Connection |
|----------|-----|---------|------------|
| **R-Link Cloud** | `rlink` | Yes (default) | Pre-connected |
| **Google Drive** | `gdrive` | No | Requires OAuth |
| **Dropbox** | `dropbox` | No | Requires OAuth |
| **Amazon S3** | `s3` | No | Requires credentials |
| **Local Download** | `local` | No | Always available |

##### Cloud Storage Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `provider` | string | `'rlink'` | Selected storage provider |
| `autoUpload` | boolean | true | Automatically upload recordings when they end |
| `retentionDays` | number | 30 | Days to keep recordings (7, 30, 90, 365, or -1 for forever) |
| `folderPath` | string | `'/Recordings'` | Storage folder path for uploaded files |
| `encryptAtRest` | boolean | true | AES-256 encryption for stored files |

##### Storage Usage Display

The settings panel shows current storage usage:
- Visual progress bar (percentage used).
- Text showing used / total storage (e.g., "2.4 GB / 10 GB").
- Available space display (e.g., "7.6 GB available").

##### Connecting Cloud Providers

1. Select a provider in the Cloud Storage Settings.
2. If not connected, a yellow warning banner appears.
3. Click **Connect [Provider Name]** to begin the OAuth or credential flow.
4. Once connected, the provider shows a green "Connected" label.
5. Click **Save Settings** to persist the configuration.

---

## Multi-Track Recording

The `MultiTrackRecorder` class provides per-participant audio recording for professional post-production workflows.

### Concept

Unlike standard recording which captures a single mixed audio output, multi-track recording creates **separate audio files for each participant**. This allows post-production editors to:
- Adjust individual volume levels.
- Apply noise reduction per speaker.
- Remove or mute specific participants.
- Create professional podcast-quality mixes.

### MultiTrackRecorder Class

The `MultiTrackRecorder` is a JavaScript class (not a React component) that manages individual audio tracks.

#### Internal Data Structure

```
tracks: Map<participantId, {
  recorder: MediaRecorder,    // Individual MediaRecorder instance
  chunks: Array<Blob>,        // Recorded audio data chunks
  stream: MediaStream,        // Audio-only MediaStream
  name: string,               // Participant display name
  startedAt: string           // ISO timestamp when track was added
}>
```

#### Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `addTrack` | `(participantId, stream, participantName)` | Add a participant's audio track. Extracts audio tracks from the MediaStream and creates a separate MediaRecorder. |
| `removeTrack` | `(participantId)` | Stop and remove a participant's track. |
| `startRecording` | -- | Start recording all added tracks simultaneously. |
| `stopRecording` | -- | Stop recording all tracks and trigger download. |
| `getStatus` | -- | Return recording status object (see below). |
| `exportBundle` | -- | Export all tracks as an array of blob objects. |
| `destroy` | -- | Stop recording and clean up all resources. |

#### Adding a Track

```
await recorder.addTrack(participantId, participantMediaStream, 'Jane Doe');
```

1. Checks if a track for this participant already exists (warns and returns if duplicate).
2. Extracts audio tracks from the participant's `MediaStream`.
3. Creates an audio-only `MediaStream` with those tracks.
4. Creates a `MediaRecorder` with `audio/webm;codecs=opus` format.
5. Sets up `ondataavailable` to collect chunks and `onstop` to trigger download.
6. If recording is already in progress, the new track starts recording immediately.
7. Returns `true` on success, `false` on failure.

#### Track Completion

When a track stops recording (either individually or when all tracks are stopped):

1. Recorded chunks are combined into a `Blob` (`audio/webm`).
2. A download URL is created via `URL.createObjectURL`.
3. The file auto-downloads as `[ParticipantName]_[timestamp].webm`.
4. The temporary URL is revoked after download.

#### Recording Status

The `getStatus()` method returns:

```
{
  isRecording: boolean,        // Whether multi-track recording is active
  trackCount: number,          // Number of participant tracks
  tracks: [
    {
      participantId: string,   // Unique participant ID
      name: string,            // Display name
      state: string,           // MediaRecorder state: 'recording', 'inactive', 'paused'
      startedAt: string        // ISO timestamp
    }
  ]
}
```

#### Export Bundle

The `exportBundle()` method returns an array of all recorded tracks:

```
[
  {
    participantId: string,
    name: string,
    blob: Blob,               // Audio data (audio/webm)
    startedAt: string
  }
]
```

### Multi-Track Enabled State

The studio tracks multi-track recording state via:

| State Variable | Type | Default | Description |
|----------------|------|---------|-------------|
| `multiTrackEnabled` | boolean | true | Whether multi-track recording is available/enabled |
| `multiTrackStatus` | object | `{ isRecording: false, tracks: [] }` | Current multi-track recording status |
| `isRecording` | boolean | false | Global recording state |
| `recordingMode` | string | `'local'` | Active recording mode: `'local'` or `'cloud'` |

---

## MultiTrackStatus Component

The `MultiTrackStatus` component displays a floating status panel during active multi-track recording.

### Display

- **Position:** Fixed at the bottom-center of the studio (`fixed bottom-24 left-1/2 -translate-x-1/2`).
- **Appearance:** Dark panel with backdrop blur, white border, rounded corners.
- **Visibility:** Only appears when `isRecording` is true and tracks exist.

### Elements

| Element | Description |
|---------|-------------|
| **Spinning disc icon** | Red animated disc icon indicating active recording (3s rotation) |
| **Title** | "Multi-Track Recording" |
| **Timer** | Red monospace timer showing elapsed recording time (MM:SS) |
| **Track list** | Scrollable list (max 32px height) of individual tracks |
| **Track item** | Shows "Track N: [Name]" with a recording indicator and state label |
| **Footer** | "Each track recording separately for post-production mixing" |

### Post-Recording Export

When recording stops (`isRecording` becomes false) but tracks exist:
- The recording panel is replaced with a green **Download All Tracks (N)** button.
- Clicking the button triggers the `onExport` callback to download all track files.

---

## Per-Participant Recording Controls

The Streaming Config Modal includes per-participant recording toggles:

### Accessing Controls

1. Open the Streaming Config Modal.
2. Expand the "Local Recording Controls" section.
3. A scrollable list of all session participants appears.

### Per-Participant Options

Each participant row shows:
- **Red pulsing dot** -- appears when the participant is being recorded (`isLocalRecording: true`).
- **Participant name** -- display name.
- **HOST badge** -- purple badge for host participants (`role === 'host'`).
- **Toggle switch** -- enable/disable recording for this specific participant.

### Behavior

- Toggling a switch calls `onToggleParticipantRecording(participantId)`.
- Each toggled participant creates a separate audio track in the `MultiTrackRecorder`.
- The footer note explains: "Multi-track: Each participant records separate audio track for post-production mixing."

---

## Recording State Management

### Global Recording State

| State | Type | Description |
|-------|------|-------------|
| `isRecording` | boolean | Master recording toggle -- true when any recording is active |
| `recordingMode` | string | `'local'` or `'cloud'` |
| `multiTrackEnabled` | boolean | Whether multi-track recording is active (default: true) |
| `multiTrackStatus` | object | `{ isRecording: boolean, tracks: Array }` |

### Recording Flow

1. **Pre-recording:**
   - Select recording mode (local or cloud).
   - Configure quality settings (for local recording).
   - Configure cloud storage settings (for cloud recording).
   - Optionally enable per-participant multi-track recording.

2. **Start recording:**
   - Set `isRecording = true`.
   - For local: `VideoRecorder.startRecording()` captures the canvas.
   - For multi-track: `MultiTrackRecorder.startRecording()` begins all participant tracks.
   - Recording timer starts.
   - Visual indicators appear (red dot, timer display, multi-track status panel).

3. **During recording:**
   - Data chunks accumulate in memory.
   - Timer increments every second.
   - Multi-track status panel shows individual track states.
   - New participants joining mid-recording can be added to multi-track.

4. **Stop recording:**
   - Set `isRecording = false`.
   - For local: `VideoRecorder.stopRecording()` finalizes the recording.
   - For multi-track: `MultiTrackRecorder.stopRecording()` triggers per-track downloads.
   - Download/export buttons appear.

5. **Post-recording:**
   - Local: Click "Download" to save the video file.
   - Multi-track: Click "Download All Tracks" to export all audio files.
   - Cloud: Recording is automatically uploaded to the configured provider.
   - Clear recording buffers for the next session.

---

## AI Highlight Generator

The `AIHighlightGenerator` component uses AI to automatically identify and extract highlights from recordings:

- Analyzes the recording for key moments (high engagement, reactions, topic changes).
- Generates short clips from the highlights.
- Available for post-processing after the recording completes.

---

## Clip Editor

The `ClipEditorModal` component provides in-session clip editing:

- Trim recordings to specific time ranges.
- Create short clips from longer recordings.
- Export clips in the same format as the main recording.

---

## Recording Editor

The `RecordingEditor` component provides basic post-recording editing capabilities:

- Timeline view of the recording.
- Trim start/end points.
- Export the edited version.

---

## Common Troubleshooting

### Q: My recording file is empty or zero bytes.
**A:** This can happen if the recording was stopped too quickly after starting, or if the browser does not support the selected format. Ensure you record for at least a few seconds. Try switching from MP4 to WebM format, which has broader browser support.

### Q: The recording quality is poor.
**A:** Check the quality setting in the VideoRecorder controls. The default is "High" (5 Mbps). For better quality, select "Ultra" (10 Mbps). Note that higher quality produces larger files and requires more processing power.

### Q: Multi-track files are downloading individually. Can I get them in one file?
**A:** Multi-track recording intentionally creates separate files per participant for post-production flexibility. After recording stops, use the "Download All Tracks" button to download all tracks at once. To combine them into a single file, use a DAW (Digital Audio Workstation) like Audacity, Adobe Audition, or GarageBand.

### Q: I do not see the multi-track recording option.
**A:** Multi-track recording is enabled by default (`multiTrackEnabled: true`). Ensure you have at least one participant on stage. Access per-participant recording controls through the Streaming Config Modal under "Local Recording Controls."

### Q: Cloud recording is not uploading.
**A:** Verify your cloud storage provider is connected (check for the green "Connected" label in Cloud Storage Settings). Ensure `autoUpload` is enabled. If using a third-party provider (Google Drive, Dropbox, S3), re-authenticate the connection. Check that you have sufficient storage space.

### Q: The recording timer shows but no file is created.
**A:** The recording file is only created when you click "Stop Recording." If you close the browser or navigate away before stopping, the recording data is lost because it is held in browser memory. Always stop recording before leaving the session.

### Q: Can I record and stream at the same time?
**A:** Yes. Recording and streaming are independent systems that can run simultaneously. Local recording captures the canvas output while streaming sends it to external platforms. Multi-track recording captures individual audio tracks regardless of streaming status.

### Q: What audio format does multi-track use?
**A:** Multi-track recording uses `audio/webm;codecs=opus` format. Opus is a high-quality, open-source audio codec suitable for voice recording. The files can be imported into any modern audio editor.

### Q: How do I change the cloud storage retention period?
**A:** Open Cloud Storage Settings, select a retention period from the dropdown (7 days, 30 days, 90 days, 1 year, or Forever), and click "Save Settings." Recordings older than the retention period are automatically deleted from the cloud provider.

### Q: Is cloud storage encrypted?
**A:** Yes, by default. The "Encrypt at rest" setting is enabled by default, using AES-256 encryption for all stored recording files. You can toggle this in Cloud Storage Settings, though disabling encryption is not recommended.

---

## API Reference

### Recording State

```
{
  isRecording: boolean,          // Global recording state
  recordingMode: 'local' | 'cloud',
  multiTrackEnabled: boolean,    // Default: true
  multiTrackStatus: {
    isRecording: boolean,
    tracks: [
      {
        participantId: string,
        name: string,
        state: 'recording' | 'inactive' | 'paused',
        startedAt: string        // ISO datetime
      }
    ]
  }
}
```

### VideoRecorder Quality Options

```
qualitySettings = {
  low:    { videoBitsPerSecond: 1000000 },   // 1 Mbps
  medium: { videoBitsPerSecond: 2500000 },   // 2.5 Mbps
  high:   { videoBitsPerSecond: 5000000 },   // 5 Mbps
  ultra:  { videoBitsPerSecond: 10000000 }   // 10 Mbps
}
```

### CloudStorageSettings Object

```
{
  provider: 'rlink' | 'gdrive' | 'dropbox' | 's3' | 'local',
  autoUpload: boolean,           // Default: true
  retentionDays: number,         // 7, 30, 90, 365, or -1 (forever)
  folderPath: string,            // Default: '/Recordings'
  encryptAtRest: boolean         // Default: true (AES-256)
}
```

### MultiTrackRecorder Methods

```
const recorder = new MultiTrackRecorder();

// Add participant track
await recorder.addTrack(participantId, mediaStream, 'Participant Name');

// Start all tracks
recorder.startRecording();

// Get status
const status = recorder.getStatus();
// { isRecording: true, trackCount: 3, tracks: [...] }

// Stop all tracks (triggers auto-download)
recorder.stopRecording();

// Export as bundle
const bundle = await recorder.exportBundle();
// [{ participantId, name, blob, startedAt }, ...]

// Remove individual track
recorder.removeTrack(participantId);

// Clean up
recorder.destroy();
```

---

## Related Features

- **Streaming:** Recording can run alongside streaming. See `15-studio-streaming.md`.
- **Overlays and Scenes:** Active overlays and scenes are captured in local recordings. See `14-studio-overlays-scenes.md`.
- **Elements:** Active elements appear in recordings. See `10-studio-elements.md`.
- **Scheduling:** Sessions with `recording_enabled: true` auto-start recording. See `22-scheduling.md`.
