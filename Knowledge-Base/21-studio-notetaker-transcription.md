# Studio Notetaker and Transcription

## Overview

R-Link's Studio includes an AI-powered notetaker and transcription system that captures, processes, and organizes spoken content during live sessions. The notetaker automatically detects meeting types, generates real-time transcripts, and produces structured meeting notes for post-session review. The system includes admin-level configuration for notetaker settings, a live transcript view within the Studio, and a dedicated MeetingNotes page for reviewing and exporting session transcripts after the fact.

---

## AI Notetaker

### How the AI Notetaker Works

The AI Notetaker is an intelligent recording and transcription assistant that operates during live sessions. When enabled, it listens to the session audio, generates a real-time transcript, and produces structured meeting notes. The notetaker can appear in the participant list so attendees are aware it is active.

**Core States:**
- `notetakerEnabled` -- Boolean state indicating whether the notetaker feature is turned on for the session.
- `notetakerRecording` -- Boolean state indicating whether the notetaker is actively recording and transcribing audio.
- `showNotetakerInList` -- Boolean toggle controlling whether the notetaker appears as a participant in the session's participant list.

### Step-by-Step: Enabling the AI Notetaker

1. The host accesses the notetaker controls in the Studio toolbar or session settings.
2. The host toggles `notetakerEnabled` to `true`, activating the notetaker for the session.
3. Optionally, the host sets `showNotetakerInList` to `true` to make the notetaker visible as a participant (providing transparency to attendees that the session is being transcribed).
4. When the session begins (or when the host manually starts recording), `notetakerRecording` is set to `true`.
5. The notetaker begins capturing audio and generating transcript entries.
6. To stop recording, the host toggles `notetakerRecording` to `false`.
7. To completely disable the notetaker, toggle `notetakerEnabled` to `false`.

### Notetaker Visibility

The `showNotetakerInList` toggle controls whether the AI notetaker appears in the session's participant list:
- **Visible (`showNotetakerInList: true`)** -- The notetaker appears as a participant, signaling to all attendees that the session is being recorded and transcribed. This is recommended for transparency and compliance.
- **Hidden (`showNotetakerInList: false`)** -- The notetaker operates silently without appearing in the participant list. The host should inform participants through other means if recording is active.

---

## Meeting Type Detection

### How Meeting Type Detection Works

The notetaker includes intelligent meeting type detection that analyzes the session context to determine the type of meeting taking place. This detection influences how the notetaker structures its notes and what information it prioritizes.

**Core States:**
- `meetingType` -- The determined meeting type, which can be set via auto-detection or manual override.
- `detectedMeetingType` -- The meeting type as determined by the automatic detection algorithm.
- `detectedConfidence` -- A confidence score indicating how certain the system is about the auto-detected meeting type.

### Auto-Detection vs. Manual Selection

**Auto-detection:**
1. When the notetaker starts, the system analyzes session context (e.g., number of participants, session mode, content being shared).
2. The `detectedMeetingType` is set based on the analysis.
3. The `detectedConfidence` score indicates the reliability of the detection (higher values mean more certainty).
4. If the confidence is sufficiently high, `meetingType` is automatically set to the `detectedMeetingType`.

**Manual selection:**
1. The host can override the auto-detected meeting type by manually selecting a `meetingType`.
2. Manual selection takes precedence over auto-detection.
3. This is useful when the auto-detection confidence is low or when the host knows the meeting type in advance.

### Impact of Meeting Type

The meeting type affects how the notetaker organizes and prioritizes information:
- Different meeting types may have different note templates (e.g., action items for team meetings, Q&A summaries for webinars).
- The AI adapts its summarization strategy based on the detected or selected meeting type.

---

## Live Transcript

### How the Live Transcript Works

The live transcript provides a real-time, scrollable view of the session's spoken content directly within the Studio interface. Participants and hosts can follow along with what is being said in text form.

**Core Components:**
- **LiveTranscript** -- The UI component rendering the transcript in the Studio.
- `showLiveTranscript` -- Boolean state controlling whether the live transcript panel is visible.
- `transcriptExpanded` -- Boolean state controlling whether the transcript panel is in expanded (full-size) or collapsed (compact) mode.
- `transcriptEntries` -- Array of transcript entry objects, each representing a segment of transcribed speech.

### Step-by-Step: Viewing the Live Transcript

1. Ensure the notetaker is enabled (`notetakerEnabled: true`) and recording (`notetakerRecording: true`).
2. Toggle `showLiveTranscript` to `true` to open the live transcript panel.
3. The **LiveTranscript** component appears in the Studio interface, displaying entries from the `transcriptEntries` array.
4. As speech is transcribed in real time, new entries are appended to `transcriptEntries` and the display scrolls to show the latest content.
5. Toggle `transcriptExpanded` to switch between compact and expanded views of the transcript.
6. To hide the transcript panel, set `showLiveTranscript` to `false`.

### Transcript Entries

Each entry in the `transcriptEntries` array represents a segment of transcribed speech, typically including:
- Speaker identification (who said it).
- Timestamp (when it was said).
- Transcribed text content.

The transcript updates continuously as long as `notetakerRecording` is `true`.

---

## NotetakerSettings Admin Configuration

### How Admin Configuration Works

The notetaker system includes admin-level configuration through the **NotetakerSettings** entity and the **NotetakerTab** in the admin panel. This allows account administrators to configure default notetaker behavior across all sessions.

**Core Components:**
- **NotetakerSettings** -- The entity storing notetaker configuration, keyed by `account_id`.
- **NotetakerTab** -- The admin panel tab where administrators configure notetaker settings.

### NotetakerSettings Entity

| Field | Type | Description |
|-------|------|-------------|
| `account_id` | string | The account to which these settings apply |

### Step-by-Step: Configuring Notetaker Settings (Admin)

1. Navigate to the admin panel.
2. Open the **NotetakerTab**.
3. Configure default notetaker settings for the account (e.g., default enabled/disabled state, default visibility in participant list, preferred meeting type templates).
4. Save the settings, which are stored in the **NotetakerSettings** entity keyed by `account_id`.
5. These settings apply as defaults for all sessions under the account, unless overridden at the session level by the host.

---

## MeetingNotes Page

### How MeetingNotes Works

The **MeetingNotes** page is a dedicated post-session interface for reviewing, searching, and exporting transcripts and AI-generated meeting notes. After a session ends, the notetaker's output is compiled into structured notes accessible from this page.

### Step-by-Step: Viewing Meeting Notes

1. After a session ends, navigate to the **MeetingNotes** page.
2. Select the session for which you want to review notes.
3. The page displays the AI-generated meeting notes, which may include:
   - Summary of key discussion points.
   - Action items and decisions.
   - Full transcript with speaker identification and timestamps.
   - Meeting type and other metadata.
4. Review the notes and optionally export them.

### Transcript Export

The MeetingNotes page supports exporting transcript data for use outside of R-Link:
- Export the full transcript with timestamps and speaker labels.
- Export AI-generated summaries and action items.
- Use exported data for record-keeping, follow-up tasks, or sharing with stakeholders who were not present.

---

## Settings and Options

| Setting | Scope | Description |
|---------|-------|-------------|
| `notetakerEnabled` | Per-session | Enable or disable the AI notetaker |
| `notetakerRecording` | Per-session | Start or stop active recording/transcription |
| `showNotetakerInList` | Per-session | Show the notetaker as a participant in the session |
| `meetingType` | Per-session | Meeting type (auto-detected or manually set) |
| `showLiveTranscript` | Per-user | Toggle visibility of the live transcript panel |
| `transcriptExpanded` | Per-user | Toggle compact/expanded transcript view |
| NotetakerSettings | Per-account (admin) | Default notetaker configuration for all sessions |

---

## Troubleshooting

### Notetaker not recording
- Verify `notetakerEnabled` is `true`.
- Verify `notetakerRecording` is `true` (the notetaker can be enabled but not yet recording).
- Check that the session audio is active (at least one participant must be speaking with an unmuted microphone).
- Ensure there are no account-level restrictions disabling the notetaker (check **NotetakerSettings** in admin).

### Live transcript not showing
- Verify `showLiveTranscript` is `true`.
- Ensure `notetakerEnabled` and `notetakerRecording` are both `true`.
- Check that `transcriptEntries` is being populated (speech must be detected to generate entries).

### Transcript entries are empty or sparse
- Ensure speakers have their microphones unmuted and are speaking clearly.
- Check audio quality -- poor microphone quality or excessive background noise can reduce transcription output.
- Verify the notetaker has been recording long enough to generate entries (there may be a brief startup delay).

### Meeting type auto-detection is wrong
- Check the `detectedConfidence` score -- low confidence values indicate the detection is uncertain.
- Manually override the `meetingType` to the correct value.
- Auto-detection may improve as more of the session unfolds and more context is available.

### Meeting notes not available after session
- Verify the notetaker was enabled and recording during the session.
- Check that the session ended properly (abrupt disconnections may result in incomplete notes).
- Navigate to the **MeetingNotes** page and search for the specific session.
- There may be a brief processing delay after the session ends before notes are finalized.

### Admin notetaker settings not applying
- Verify the settings were saved successfully in the **NotetakerTab**.
- Check that the `account_id` in **NotetakerSettings** matches the account running the session.
- Session-level overrides by the host take precedence over admin defaults.

---

## FAQ

**Q: Does the notetaker work in all session modes (Meeting, Webinar, Live Stream)?**
A: Yes, the AI notetaker can be enabled in any session mode. Meeting type detection adapts its behavior based on the session context.

**Q: Can participants see the live transcript?**
A: Each participant controls their own `showLiveTranscript` toggle. When enabled, they see the live transcript in their Studio view. The host controls whether the notetaker is active (`notetakerEnabled`), but participants control their own transcript visibility.

**Q: How does meeting type detection decide the type?**
A: The system analyzes session context such as the number of participants, session mode, content being shared, and other signals. The `detectedConfidence` score reflects how certain the system is. If confidence is low, the host should manually set the `meetingType`.

**Q: Can I edit the meeting notes after the session?**
A: The **MeetingNotes** page provides the ability to review and export notes. Editing capabilities depend on the platform's current feature set.

**Q: Are transcripts private?**
A: Transcript data is associated with the session and account. Access controls follow the platform's general privacy and permissions model. The `showNotetakerInList` toggle provides transparency to participants that transcription is occurring.

**Q: How long does it take for meeting notes to be available after a session?**
A: There may be a brief processing delay after the session ends while the AI finalizes summaries and organizes notes. Typically, notes should be available shortly after the session concludes.

**Q: Can I export just the transcript without the AI-generated summaries?**
A: Yes, the **MeetingNotes** page supports exporting the full transcript separately from AI-generated summaries and action items.

**Q: What is the difference between the live transcript and live captions?**
A: Live captions (Document 20) provide an on-screen text overlay of speech in real time, with optional translation. The live transcript (this feature) is a persistent, scrollable log of all speech with speaker identification and timestamps, stored as `transcriptEntries` for later review and export.

---

## Known Limitations

- The notetaker requires active audio to generate transcript entries; silent portions of the session will not produce content.
- Meeting type auto-detection may have lower confidence in sessions with few participants or minimal context.
- Transcript accuracy depends on audio quality, speaker clarity, and language complexity.
- There may be a brief startup delay when the notetaker begins recording before the first transcript entries appear.
- The `transcriptEntries` array grows throughout the session; very long sessions may result in large transcript data.
- Meeting notes processing may take time after the session ends; notes may not be immediately available.
- The notetaker is session-scoped; it does not carry over context between separate sessions.

---

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| AI Notetaker | Available | Available |
| Live Transcript | Available | Available |
| Meeting Type Detection | Available | Available |
| MeetingNotes Page | Available | Available |
| NotetakerSettings Admin | Available | Available |
| Transcript Export | Available | Available |

Notetaker and transcription features are available across both plans.

---

## Related Documents

- [01 - Platform Overview](01-platform-overview.md) -- General platform capabilities.
- [20 - Studio Translation & Captions](20-studio-translation-captions.md) -- Real-time captions and translation (distinct from persistent transcription).
- [18 - Studio Collaboration](18-studio-collaboration.md) -- Collaboration features that generate content captured by the notetaker.
- [19 - Studio Reactions & Engagement](19-studio-reactions-engagement.md) -- Engagement data that may complement meeting notes.
