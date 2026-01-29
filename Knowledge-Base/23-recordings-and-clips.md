# 23 - Recordings and Clips

## Overview

R-Link provides two complementary content management tabs in the admin dashboard: **Recordings** (for full session recordings) and **Clips** (for repurposed content extracted from recordings). The Recordings tab is powered by the `RecordingsTab` component and manages `Recording` entities. The Clips tab is powered by the `ClipsTab` component and manages `RepurposedClip` entities. Together, these features form a complete post-session content pipeline: record, review, clip, repurpose, share, and analyze.

---

## Recordings Tab

### Accessing Recordings

1. Log in to your R-Link account.
2. Navigate to the Admin Dashboard.
3. Click the **Recordings** tab in the left sidebar.

### Dashboard Statistics

The top of the Recordings tab displays four summary cards:

| Stat | Description |
|------|-------------|
| **Total Recordings** | Count of all recordings across all folders |
| **Total Duration** | Sum of all recording durations (displayed as hours and minutes) |
| **Total Storage** | Sum of all file sizes (displayed in MB or GB) |
| **Total Views** | Sum of all recording view counts |

### Search and Organization

- **Search bar**: Filter recordings by title or room name. Type to filter in real time.
- **Folders**: Organize recordings into custom folders with color coding.
  - Click "New Folder" to create a folder.
  - Click a folder name in the sidebar to filter recordings to that folder.
  - Click "All Recordings" to show all recordings regardless of folder.
  - Right-click or use the three-dot menu on folders to edit name/color or delete.
  - Deleting a folder moves recordings to "All Recordings" (recordings are not deleted).
  - Move recordings between folders via the three-dot menu on each recording card.

---

## Recording Entity

The `Recording` entity stores all data for a recorded session. Key fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `title` | string | Recording title (typically matches the session title) |
| `description` | string | Description, may include AI-generated transcript summary |
| `room_name` | string | Name of the room where the recording was made |
| `file_url` | string | URL of the recording file |
| `file_size_bytes` | number | File size in bytes |
| `duration_seconds` | number | Recording duration in seconds |
| `recorded_at` | datetime | When the recording was captured |
| `participant_count` | number | Number of participants during the recorded session |
| `status` | string | `'processing'`, `'ready'`, or `'failed'` |
| `processing_progress` | number | Progress percentage (0-100) during processing |
| `folder_id` | string | ID of the folder this recording belongs to (null = root) |
| `access_type` | string | `'private'`, `'public'`, `'password'`, or `'registered'` |
| `share_token` | string | Random token for shareable link generation |
| `view_count` | number | Number of times the recording has been viewed |
| `download_count` | number | Number of times the recording has been downloaded |
| `download_enabled` | boolean | Whether download is allowed (default: true) |
| `expires_at` | datetime | Optional expiration date for the recording |
| `expired` | boolean | Whether the recording has expired |

### Recording Status Lifecycle

1. **Processing** -- Recording is being processed after the session ends. A progress percentage is shown (e.g., "Processing 45%"). The recording is not yet playable or downloadable.
2. **Ready** -- Processing is complete. The recording can be played, downloaded, shared, and clipped.
3. **Failed** -- Processing encountered an error. The recording file may be corrupt or unavailable. Contact support.

### Access Types

| Type | Description |
|------|-------------|
| `private` | Only the account owner and team members with recording permissions can access |
| `public` | Anyone with the share link can view the recording |
| `password` | Viewers must enter a password to access the recording |
| `registered` | Viewers must register (provide name/email) before watching |

---

## Recording Modes

R-Link supports two recording modes:

### Local Recording

- Recordings are stored locally on the host's machine.
- Files are captured in the browser and saved directly to the local file system.
- No cloud storage usage is consumed.
- Useful for environments with limited bandwidth or strict data residency requirements.
- Local recordings must be manually uploaded if sharing is needed.

### Cloud Recording

- Recordings are stored in R-Link's cloud infrastructure.
- Files are automatically uploaded after the session ends.
- Processing is handled server-side (encoding, optimization).
- Cloud recordings appear automatically in the Recordings tab once processing completes.
- Cloud recordings support sharing, embedding, and analytics.

---

## Multi-Track Recording

R-Link includes a `MultiTrackRecorder` component that captures separate audio and video tracks for each participant in a session. Key capabilities:

- **Individual tracks**: Each participant's audio and video are recorded as separate tracks.
- **Post-production flexibility**: Separate tracks allow for independent editing of each participant's audio/video levels, cropping, and positioning.
- **Higher quality output**: Individual track recording avoids compression artifacts from composite recording.
- **Clip creation**: Multi-track recordings provide better source material for AI clip generation, as the system can isolate individual speakers.
- Multi-track recording is initiated from the Studio interface during an active session.

---

## Recording Actions

For recordings with `status: 'ready'`:

### Play
- Click the **Play** button to open the built-in video player modal.
- The video player supports standard playback controls (play/pause, seek, volume, fullscreen).

### Download
- Click the **Download** button to save the recording file locally.
- The download counter is automatically incremented.
- Downloads can be disabled per-recording via the settings modal.

### Share
- Click the **Share** button to generate a shareable link.
- If no `share_token` exists, one is auto-generated.
- The share URL format is: `{origin}/recording/{share_token}`
- The link is automatically copied to the clipboard.
- Private recordings are changed to public access when shared.

### Settings
- Click the **Settings** button to open the recording settings modal.
- Configure access type, expiration, download permissions, and other metadata.

### Generate AI Transcript Summary
- From the three-dot overflow menu, select "Generate Transcript Summary".
- The system uses AI (LLM integration) to generate a comprehensive summary including:
  - Executive summary (2-3 sentences)
  - Main topics covered with approximate timestamps
  - Key takeaways and action items (5-7 bullet points)
  - Notable quotes and moments with timestamps
  - Clip-worthy segments (3-5 suggestions with time ranges)
  - Target audience and use cases
- The generated summary is appended to the recording's description field.

### Move to Folder
- From the three-dot overflow menu, select a destination folder.
- Select "Move to All Recordings" to remove from any folder.

### Delete
- From the three-dot overflow menu, select "Delete".
- Confirm the deletion. This action is permanent and cannot be undone.

---

## Clips Tab

### Accessing Clips

1. Navigate to the Admin Dashboard.
2. Click the **Clips** tab in the left sidebar (or navigate from within the Recordings tab).

### Dashboard Statistics

The Clips tab displays four summary cards:

| Stat | Description |
|------|-------------|
| **Total Clips** | Count of all repurposed clips |
| **Ready** | Number of clips with `status: 'ready'` |
| **Processing** | Number of clips currently being generated |
| **Total Duration** | Sum of all clip durations |

### Clip Organization

#### Folders
- Create folders with custom names and colors to organize clips.
- Filter by folder using the folder buttons at the top.
- "All Clips" shows everything; "Uncategorized" shows clips without a folder.
- Delete a folder without deleting its clips.

#### Tags
- Clips can be tagged with keywords for categorization.
- Tags appear as purple badges on clip cards.
- Use the tag filter section to filter clips by one or more tags.
- Click a tag to toggle it on/off in the filter.
- Click "Clear" to remove all tag filters.

### Search and Filtering

- **Search bar**: Search by clip title, description, tags, or parent recording title.
- **Status filter**: Filter by `all`, `pending`, `processing`, `ready`, or `failed`.
- **Platform filter**: Filter by `all`, `youtube`, `instagram`, `tiktok`, `linkedin`, `twitter`, `facebook`, or `custom`.

---

## RepurposedClip Entity

The `RepurposedClip` entity stores clip data. Key fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `title` | string | Clip title |
| `description` | string | Clip description |
| `recording_id` | string | ID of the source recording |
| `file_url` | string | URL of the rendered clip file |
| `thumbnail_url` | string | URL of the clip thumbnail |
| `duration_seconds` | number | Clip duration in seconds |
| `platform` | string | Target platform: `'youtube'`, `'instagram'`, `'tiktok'`, `'linkedin'`, `'twitter'`, `'facebook'`, `'custom'` |
| `aspect_ratio` | string | Video aspect ratio (e.g., `'16:9'`, `'9:16'`, `'1:1'`) |
| `status` | string | `'pending'`, `'processing'`, `'ready'`, or `'failed'` |
| `error_message` | string | Error details if status is `'failed'` |
| `tags` | array | Array of string tags for categorization |
| `folder_id` | string | ID of the clip folder (null = uncategorized) |
| `created_date` | datetime | When the clip was created |

### Clip Status Lifecycle

1. **Pending** -- Clip has been defined but processing has not started. Gray badge.
2. **Processing** -- Clip is being rendered/generated. Yellow badge with spinner.
3. **Ready** -- Clip is fully processed and available for playback, download, and sharing. Green badge.
4. **Failed** -- Clip generation failed. Red badge. Error message displayed on the card.

### Platform Icons and Colors

| Platform | Icon Color | Badge Color |
|----------|-----------|-------------|
| YouTube | #FF0000 (red) | Red |
| Instagram | #E4405F (pink) | Pink |
| TikTok | #000000 (black) | Black |
| LinkedIn | #0A66C2 (blue) | Blue |
| Twitter | #1DA1F2 (light blue) | Light blue |
| Facebook | #1877F2 (blue) | Blue |
| Custom | #6a1fbf (purple) | Purple |

---

## Creating Clips

There are three methods to create clips from a recording:

### 1. Manual Clip Editor

- From the Recordings tab, click "Create Clip" on any ready recording, then select "Manual Clip Editor".
- Opens the `ClipEditorModal` with timeline-based editing controls.
- Manually set start and end times for the clip.
- Configure clip title, description, platform, aspect ratio, and tags.
- Preview the clip before saving.
- Save to generate the clip as a `RepurposedClip` entity.

### 2. AI Clip Generator

- From the Recordings tab, click "Create Clip" on any ready recording, then select "AI Clip Generator".
- Also accessible from the Clips tab via the "AI Generate Clips" button.
- Opens the `AIClipGeneratorModal`.
- The AI analyzes the recording content and automatically identifies the most engaging, shareable moments.
- AI suggests clip boundaries, titles, descriptions, and optimal platform/aspect ratio.
- Select which AI-suggested clips to generate.
- Assign clips to folders during generation.
- Generated clips are created as `RepurposedClip` entities and appear in the Clips tab.

### 3. From Transcript

- From the Recordings tab, click "Create Clip" on any ready recording, then select "From Transcript".
- Opens the `TranscriptSegmentSelector`.
- Browse the recording's transcript to identify interesting segments.
- Select transcript segments to define clip boundaries.
- The system calculates corresponding video timestamps from transcript positions.
- Assign clips to folders.
- Created clips appear in the Clips tab.

---

## Clip Actions

### Play
- Click **Play** on any clip with `status: 'ready'` to open the video player modal.

### Download
- Click the **Download** button to save the clip file locally as MP4.

### Edit
- Click **Edit** to reopen the clip in the clip editor modal.
- Modify title, description, timestamps, platform, and other metadata.
- Save changes to update the `RepurposedClip` entity.

### Repurpose
- Click **Repurpose** to open the `ClipRepurposingModal`.
- Create derivative clips from an existing clip, optimized for different platforms.
- For example, convert a 16:9 YouTube clip into a 9:16 TikTok/Reels clip.
- Repurposed clips are created as new `RepurposedClip` entities linked to the same source recording.

### Share
- Click **Share** to open the `ClipSharingModal`.
- Generate shareable links, embed codes, or social media posts.
- Share directly to connected social platforms.

### Delete
- Click the **Delete** (trash) button on any clip card.
- Confirm the deletion. This action is permanent and cannot be undone.

---

## Clip Analytics

- Toggle the analytics dashboard by clicking "Show Analytics" / "Hide Analytics" at the top of the Clips tab.
- The `ClipAnalyticsDashboard` component displays performance metrics for clips.
- Metrics may include views, engagement rates, platform performance comparisons, and trending clips.
- Analytics help identify which types of clips perform best for future content strategy.

---

## Recording Folders

### Creating a Folder
1. Click "New Folder" in the Recordings tab.
2. Enter a folder name.
3. Optionally choose a color.
4. Click "Save" to create.

### Editing a Folder
1. Hover over the folder in the sidebar.
2. Click the three-dot menu icon.
3. Select "Edit" to change name or color.

### Deleting a Folder
1. Hover over the folder in the sidebar.
2. Click the three-dot menu icon.
3. Select "Delete".
4. Confirm the deletion. Recordings in this folder are moved to "All Recordings" -- they are not deleted.

---

## Clip Folders

### Creating a Clip Folder
1. Click "New Folder" in the Clips tab.
2. Enter a folder name in the inline form.
3. Choose a color using the color picker.
4. Click "Save" to create.

### Deleting a Clip Folder
1. Hover over the folder button.
2. Click the red "X" button that appears.
3. Confirm the deletion. Clips in this folder become "Uncategorized" -- they are not deleted.

---

## Common Troubleshooting

### Q: My recording is stuck in "Processing" status.
**A:** Recording processing typically takes a few minutes depending on the recording length and server load. If a recording remains in "Processing" for more than 30 minutes, there may be a server-side issue. Try refreshing the page. If the issue persists, contact support with the recording ID.

### Q: I cannot play or download my recording.
**A:** Recordings must have `status: 'ready'` and a valid `file_url` to be playable or downloadable. Also check that the recording has not expired (check the `expires_at` field). Expired recordings display a red "Expired" badge and cannot be accessed.

### Q: My recording shows "Failed" status.
**A:** A failed recording means the processing pipeline encountered an error. This can happen due to corrupted source files, server issues, or unsupported formats. Contact support to investigate. The source file may need to be re-recorded.

### Q: How do I make a recording private after sharing it?
**A:** Open the recording's Settings modal and change the access type back to "private". Note that the share token remains in the system but the recording will no longer be accessible via the shared link.

### Q: AI clip generation is not finding good moments in my recording.
**A:** The AI clip generator works best with recordings that have clear audio, varied content, and distinguishable segments. Short recordings (under 5 minutes) or recordings with poor audio quality may not yield optimal clip suggestions. Try using the manual clip editor or transcript selector instead.

### Q: How do I move a clip to a different folder?
**A:** Currently, clip folder assignment is done during creation (in the AI generator or transcript selector). To change a clip's folder, edit the clip and update the folder assignment.

### Q: What video format are clips exported in?
**A:** Clips are exported as MP4 files. The aspect ratio depends on the target platform selected during clip creation (16:9 for YouTube, 9:16 for TikTok/Reels/Shorts, 1:1 for Instagram feed).

### Q: Can I create clips from local recordings?
**A:** Clips can only be created from recordings that have been uploaded to the cloud and have `status: 'ready'`. Local recordings must be uploaded first before clip generation is available.

### Q: How does repurposing differ from creating a new clip?
**A:** Repurposing takes an existing ready clip and re-renders it for a different platform/aspect ratio without going back to the source recording. It is faster and preserves any edits made to the original clip. Creating a new clip goes back to the source recording for fresh extraction.

---

## API Reference

### Recordings

```
// List all recordings (newest first)
Recording.list('-recorded_at')

// Delete a recording
Recording.delete(id)

// Update recording metadata
Recording.update(id, { title: 'New Title', access_type: 'public' })
```

### Recording Folders

```
// List folders sorted by order
RecordingFolder.list('order')

// Create a folder
RecordingFolder.create({ name: 'Webinars', color: '#6a1fbf', order: 0 })

// Update a folder
RecordingFolder.update(id, { name: 'Updated Name' })

// Delete a folder
RecordingFolder.delete(id)
```

### Repurposed Clips

```
// List all clips (newest first)
RepurposedClip.list('-created_date')

// Create a clip
RepurposedClip.create({
  title: 'Key Moment',
  recording_id: 'rec_abc123',
  platform: 'youtube',
  aspect_ratio: '16:9',
  status: 'pending',
  tags: ['highlight', 'keynote']
})

// Update a clip
RepurposedClip.update(id, { title: 'Updated Title', tags: ['updated'] })

// Delete a clip
RepurposedClip.delete(id)
```

### Clip Folders

```
// List clip folders sorted by order
ClipFolder.list('order')

// Create a clip folder
ClipFolder.create({ name: 'Social Media', color: '#00c853', order: 0 })

// Update a clip folder
ClipFolder.update(id, { name: 'Updated Name', color: '#ff0000' })

// Delete a clip folder
ClipFolder.delete(id)
```

---

## Related Features

- **Scheduling**: Sessions with `recording_enabled: true` auto-generate recordings. See `22-scheduling.md`.
- **Brand Kits**: Clips can be styled with brand overlays (lower thirds, watermarks). See `24-brand-kits.md`.
- **Integrations**: Cloud storage integrations (Google Drive, Dropbox) can auto-sync recordings. See `27-integrations.md`.
- **Studio**: The multi-track recorder is controlled from the Studio interface during live sessions.
