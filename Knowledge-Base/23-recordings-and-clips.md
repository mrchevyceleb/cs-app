# Recordings and Clips

## Overview

The Recordings tab and Clips tab are located in Group 3 of the Admin Sidebar (alongside Rooms, Schedule, and Event Landing Pages). Together, they provide a complete workflow for capturing live sessions, storing them, generating clips, and sharing content.

- **Recordings tab** (`RecordingsTab` component): Manages all recorded sessions, supports local and cloud recording modes, and includes multi-track recording via the `MultiTrackRecorder`.
- **Clips tab** (`ClipsTab` component): Manages video clips created from recordings, with AI-powered clip generation for automated highlight extraction.

## Recording Modes

R-Link supports two distinct recording modes, each with different storage, quality, and workflow characteristics.

### Local Recording

Local recording captures the session directly to the host's device.

- **Storage location**: The recording file is saved to the host's local filesystem (typically the Downloads folder or a user-specified directory).
- **File format**: Recordings are saved in a standard video format (WebM or MP4 depending on browser support).
- **Quality**: Full resolution as rendered in the browser, not subject to network bandwidth constraints for the recording itself.
- **Availability**: The recording is available immediately on the host's machine once the session ends or recording is stopped.
- **Admin visibility**: Local recordings do not automatically appear in the Recordings tab since they reside on the host's device. They must be manually uploaded to appear in the admin panel.

**When to use local recording:**
- When cloud storage is not available on the plan.
- When the highest possible local quality is needed.
- When the host wants immediate access to the file without waiting for cloud processing.

### Cloud Recording

Cloud recording captures the session and stores it in R-Link's cloud infrastructure.

- **Storage location**: Recordings are stored in R-Link's cloud storage, accessible from the Recordings tab.
- **File format**: Processed and stored in MP4 format.
- **Quality**: Quality depends on the session's streaming resolution and network conditions.
- **Processing**: After the session ends, cloud recordings undergo processing (encoding, optimization) before they become available. Processing time varies by session length.
- **Availability**: Once processing completes, the recording appears automatically in the Recordings tab.
- **Storage limits**: Cloud storage is subject to plan-based storage quotas.

**When to use cloud recording:**
- When recordings need to be accessible to the entire team from the admin panel.
- When automatic backup and centralized management are needed.
- When clips and AI-powered features will be used on the recording.

### Multi-Track Recording

The `MultiTrackRecorder` component enables multi-track recording, which captures each participant's audio and video as separate tracks.

- **Separate tracks**: Each participant's camera feed and audio are recorded as individual tracks.
- **Post-production flexibility**: Separate tracks allow for advanced editing -- adjust individual audio levels, swap camera angles, or create picture-in-picture layouts after the fact.
- **Use cases**: Professional production, podcast-style recordings, high-quality webinar content.
- **Storage**: Multi-track recordings consume more storage than single-track because each participant generates an independent file.
- **Availability**: Multi-track recording is a premium feature available on Business plans.

## Managing Recordings

### Accessing Recordings

1. Navigate to the **Recordings** tab in the Admin Sidebar.
2. The recordings list displays all cloud recordings for the account.
3. Each entry shows: session name, date, duration, recording mode, file size, and status (processing, ready, or error).

### Recording Statuses

| Status | Description |
|--------|-------------|
| Processing | The recording is being encoded and optimized after session end |
| Ready | The recording is fully processed and available for playback, download, or clipping |
| Error | Processing failed; the recording may need to be re-processed or is unrecoverable |

### Playback

- Click on any recording with "Ready" status to open the built-in video player.
- The player supports standard controls: play/pause, seek, volume, playback speed, and fullscreen.
- For multi-track recordings, the player may offer track selection to view individual participant feeds.

### Downloading Recordings

- Click the **Download** button on any ready recording.
- For single-track recordings, a single MP4 file is downloaded.
- For multi-track recordings, a ZIP archive containing all individual track files may be provided, or the user can select individual tracks.

### Deleting Recordings

- Select one or more recordings and click **Delete**.
- Deletion is permanent and frees up cloud storage quota.
- Recordings with associated clips will prompt a warning before deletion.

### Sharing Recordings

- **Share link**: Generate a shareable link for any ready recording. Configure access controls (public, password-protected, or restricted to account members).
- **Embed code**: Generate an embed snippet to place the recording on an external website.
- **Email share**: Send the recording link directly via email (uses connected email integration if available).
- **Cloud storage export**: If Google Drive or Dropbox integration is connected, export recordings directly to cloud storage (see document 27-integrations.md).

## Recording Analytics

Cloud recordings include analytics to track engagement.

- **View count**: Total number of times the recording has been viewed.
- **Unique viewers**: Number of distinct viewers.
- **Average watch time**: How long viewers watch on average.
- **Drop-off points**: Identify where viewers stop watching.
- **Engagement graph**: Visual timeline showing viewer engagement density across the recording duration.
- **Viewer details**: If viewers are identified (e.g., via registration or login), see individual viewer watch data.

## Clips

### What Are Clips?

Clips are short video segments extracted from full recordings. They are managed in the **Clips** tab (`ClipsTab` component) and are useful for creating highlight reels, social media content, or focused training snippets.

### Creating Clips Manually

1. Open a recording from the **Recordings** tab.
2. Use the playback timeline to set the **start point** and **end point** for the clip.
3. Click **Create Clip**.
4. Enter a clip title and optional description.
5. The clip is processed and appears in the **Clips** tab once ready.

### AI-Powered Clip Generation

R-Link includes AI-powered clip generation that automatically identifies and extracts highlights from recordings.

**How AI clips work:**
1. Navigate to a recording and select **Generate AI Clips** (or use the AI clips option in the Clips tab).
2. The AI analyzes the recording for:
   - Key discussion topics and transitions.
   - High-engagement moments (audience reactions, Q&A segments).
   - Speaker highlights and quotable statements.
   - Natural segment boundaries.
3. The AI generates a set of suggested clips with recommended start/end points and auto-generated titles.
4. Review the suggested clips: accept, reject, or adjust the boundaries.
5. Accepted clips are processed and added to the Clips tab.

**AI clip settings:**
- **Target clip length**: Set preferred clip duration range (e.g., 30 seconds to 3 minutes).
- **Number of clips**: Suggest a maximum number of clips to generate.
- **Focus area**: Optionally specify topics or keywords the AI should prioritize.

### Managing Clips

1. Navigate to the **Clips** tab in the Admin Sidebar.
2. All clips are listed with: title, source recording, duration, creation date, and status.
3. Available actions per clip:
   - **Play**: Preview the clip in the built-in player.
   - **Edit**: Adjust the clip boundaries (re-process required).
   - **Download**: Download the clip as an MP4 file.
   - **Share**: Generate a share link, embed code, or send via email.
   - **Delete**: Permanently remove the clip.

### Clip Organization

- **Search**: Search clips by title or source recording name.
- **Filter**: Filter by date range, source recording, or creation method (manual vs. AI-generated).
- **Sort**: Sort by date created, title, duration, or view count.

## Settings and Options

### Recording Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Default recording mode | Local or Cloud | Cloud (Business), Local (Basic) |
| Auto-record | Automatically start recording when a session begins | Off |
| Recording notification | Notify participants that the session is being recorded | On |
| Multi-track recording | Record each participant as a separate track | Off |
| Cloud storage region | Preferred storage region for cloud recordings | Auto |

### Clip Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Default clip format | Output format for clips | MP4 |
| AI clip generation | Enable AI-powered clip suggestions | On (Business) |
| Target clip length | Preferred duration range for AI clips | 30s - 180s |
| Max AI clips per recording | Maximum number of AI-suggested clips | 10 |

## Troubleshooting

### Recording did not save
- **Local recording**: Check the host's Downloads folder or browser download settings. Some browsers may block large file downloads.
- **Cloud recording**: Verify the session ended properly (abrupt disconnections may interrupt cloud recording upload). Check the Recordings tab for entries with "Error" status.
- Ensure cloud storage quota has not been exceeded.

### Recording is stuck in "Processing" status
- Cloud recordings typically process within a few minutes for short sessions, but long recordings (2+ hours) may take longer.
- If processing takes more than 1 hour, contact support -- the recording may need manual re-processing.
- Do not delete a recording that is still processing.

### Multi-track recording missing participant tracks
- Multi-track recording requires all participants to have stable connections. If a participant disconnects mid-session, their track may be incomplete.
- Verify that multi-track recording was enabled before the session started, not mid-session.

### AI clips not generating
- AI clip generation requires a cloud recording with "Ready" status. Local recordings must be uploaded first.
- Ensure the account is on a Business plan (AI clips are a Business feature).
- Very short recordings (under 5 minutes) may not produce AI clip suggestions.

### Clip has poor quality
- Clip quality is derived from the source recording quality. If the recording was low resolution, clips will also be low resolution.
- Multi-track recordings generally produce higher-quality clips since individual tracks can be used.

### Cannot share recording or clip
- Verify the recording/clip has "Ready" status.
- Check that the share settings allow the intended audience (public vs. restricted).
- If using email sharing, ensure an email integration is connected.

### Cloud storage quota exceeded
- Navigate to **Billing & Usage** in the Admin Sidebar to check current storage usage.
- Delete old recordings or clips to free up space.
- Upgrade to a higher plan tier for more storage.

## FAQ

**Q: Can I record a session in both local and cloud modes simultaneously?**
A: Yes. The host can enable both local and cloud recording for the same session. The local copy saves to the host's device while the cloud copy is uploaded and processed separately.

**Q: How long are cloud recordings retained?**
A: Cloud recordings are retained as long as the account is active and within its storage quota. There is no automatic expiration, but storage limits may require cleanup over time.

**Q: Can I convert a local recording to a cloud recording?**
A: Not directly through automatic sync. However, you can upload a local recording file to the platform if an upload mechanism is provided, or export it to connected cloud storage (Google Drive, Dropbox).

**Q: Who can access recordings?**
A: Access is controlled by the `recordings` permission category. Team members with `recordings.view` permission can see recordings. Shared links can be configured for public or restricted access.

**Q: Can I create clips from a live session (not a recording)?**
A: No. Clips are created from completed recordings. The session must end and the recording must reach "Ready" status before clips can be generated.

**Q: How does AI clip generation decide what to highlight?**
A: The AI analyzes audio transcription, speaker changes, audience engagement signals (reactions, chat activity), and topic transitions to identify the most relevant segments. You can influence results by setting focus keywords.

**Q: Can I edit the AI-generated clip titles?**
A: Yes. AI-generated titles are suggestions and can be edited before or after the clip is created.

**Q: What happens to clips if I delete the source recording?**
A: Clips are independent files once created. Deleting the source recording does not delete existing clips, but you will no longer be able to create new clips from that recording.

## Known Limitations

- Local recordings are not managed centrally and do not appear in the Recordings tab unless manually uploaded.
- Multi-track recording increases storage usage proportionally to the number of participants.
- AI clip generation is only available for cloud recordings with audio content (screen-only recordings without audio may not produce meaningful clips).
- Cloud recording processing time is variable and cannot be expedited.
- Recording quality cannot exceed the session's live streaming resolution.
- Clips cannot span across multiple recordings; each clip must come from a single source recording.
- The maximum recording duration for cloud recordings may be subject to plan-based limits.

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Local recording | Yes | Yes |
| Cloud recording | Limited storage | Extended storage |
| Multi-track recording (`MultiTrackRecorder`) | No | Yes |
| Recording playback | Yes | Yes |
| Download recordings | Yes | Yes |
| Share recordings | Basic sharing | Advanced sharing with analytics |
| Recording analytics | No | Yes |
| Manual clip creation | Limited | Yes |
| AI-powered clip generation | No | Yes |
| Cloud storage export (Drive/Dropbox) | No | Yes |

## Related Documents

- **22-scheduling.md** -- Scheduling sessions that will be recorded
- **24-brand-kits.md** -- Branding applied to recordings and clips
- **27-integrations.md** -- Cloud storage, email, and streaming integrations for recordings
- **21-admin-panel-navigation.md** -- Navigating the admin panel sidebar
